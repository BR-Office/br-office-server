# docservice round 2: DB load of backoff sync-convert polling (PKT-0116, claude-opus-5-5, 2026-11-04)

Native .deb stack on this VM (2 CPU, 7 GB). **original** = installed DocService (Euro-Office 9.3.7,
127.0.0.1:80, fixed 1 s sync poll); **new** = this worktree's `DocService/sources/server.js` (commit 2546a24,
PKT-0068 backoff polling) run from source on :8099 against the same PostgreSQL/RabbitMQ/x2t/config
(`NODE_CONFIG='{"services":{"CoAuthoring":{"server":{"port":8099}}}}'`, other env from `ds-docservice.service`).
Script: `SYNC=1 node .theseus/oracle/perf/e2e-convert.js 10 4 <base>` (10 runs per pair, 4 in parallel,
plus 1 uncounted warm-up per pair = 77 conversions per server). 0 errors on both. Runs were sequential
(original first, then new).

## Method
`ALTER SYSTEM SET log_statement='all'` + `pg_reload_conf()` (reset afterwards), the PostgreSQL log slice of
each run saved, and every `task_result` statement attributed to a request by its `conv_k...` key from the
`DETAIL: parameters` line (so background work of the other server is excluded). The driver uses prepared
statements: they appear as `execute <unnamed>: SELECT * FROM task_result WHERE tenant=$1 AND id=$2`, not
as `statement:` (a first count on `statement:` gave 0).

## taskResult selects and latency per pair (convertMs = sync request -> result URL)

| Pair | orig p50 ms | orig max | orig selects/req (avg/max) | new p50 ms | new max | new selects/req (avg/max) |
|---|---|---|---|---|---|---|
| docx->pdf | 4130 | 4564 | 3.1 / 4 | 2667 | 5689 | 6.5 / 9 |
| docx->odt | 1036 | 1263 | 1.0 / 1 | 373 | 382 | 2.7 / 3 |
| xlsx->pdf | 4121 | 4142 | 3.4 / 4 | 1748 | 3597 | 5.5 / 7 |
| xlsx->ods | 1017 | 1053 | 1.0 / 1 | 367 | 369 | 2.7 / 3 |
| pptx->pdf | 5059 | 5306 | 4.1 / 5 | 2580 | 2586 | 5.5 / 6 |
| pptx->odp | 1017 | 1041 | 1.0 / 1 | 365 | 372 | 2.6 / 3 |
| pdf->docx | 1019 | 1056 | 1.0 / 1 | 170 | 383 | 2.1 / 3 |

Totals over 77 conversions: original 160 taskResult selects (2.1/req), new 306 (4.0/req); UPDATE and
INSERT on task_result are 77/77 on both (one each per request, unchanged).
Throughput (req/s, 4 parallel): ODF pairs 3.0-3.2 -> 10.8-11.0; pdf->docx 3.17 -> 13.87.

## Reading
- Backoff adds ~1.6-3.4 selects per request: within PKT-0068's expected "up to ~6 extra in the first 1.5 s"
  (max seen +5 on docx->pdf, 9 vs 4). Each is a primary-key lookup on task_result.
- Per second of wall time the new server issues more selects (306 in a shorter run), but the load stays
  tiny: ~4 indexed selects per conversion versus an x2t conversion costing 0.16-2.6 s of CPU. Not a
  bottleneck at this scale; p50 latency drops 0.65-2.5 s per request.
- Under 4-parallel load PDF pairs queue on 2 CPUs (original p50 ~4.1-5.1 s); new max 5689 ms on docx->pdf
  is one queued run, p50 still lower.

## Not measured
- Query time per select (log_min_duration not enabled), PostgreSQL CPU; pg_stat_statements is available but
  not in shared_preload_libraries (needs a PostgreSQL restart).
- Concurrency above 4.
