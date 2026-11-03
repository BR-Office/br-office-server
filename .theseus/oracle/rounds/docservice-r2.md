# docservice round 2 measurement (PKT-0102, claude-opus-5-5, 2026-11-03)

Native .deb stack on this VM (2 CPU, 7 GB). Differential: **original** = installed DocService
(Euro-Office 9.3.7 build, 127.0.0.1:80, pre-round-1 code) against **new** = this worktree's
`DocService/sources/server.js` (commit bdff618, includes PKT-0068 backoff polling and PKT-0070 guards)
run from source on :8099 against the same PostgreSQL, RabbitMQ, FileConverter/x2t and config
(`NODE_CONFIG='{"services":{"CoAuthoring":{"server":{"port":8099}}}}'`, other env from
`ds-docservice.service`). Script: `SYNC=1 node .theseus/oracle/perf/e2e-convert.js 5 1 <base>`
(server sync mode, 5 sequential runs per pair, en-US `new.*` templates, JWT signed). 0 errors on both.

## Sync ConvertService, request -> result URL (ms)

| Pair | original p50 | original max | new p50 | new max | p50 gain |
|---|---|---|---|---|---|
| docx->pdf | 2325 | 4355 | 767 | 775 | -1558 |
| docx->odt | 1265 | 2862 | 164 | 168 | -1101 |
| xlsx->pdf | 1309 | 2345 | 774 | 1568 | -535 |
| xlsx->ods | 1208 | 1482 | 166 | 374 | -1042 |
| pptx->pdf | 2013 | 2805 | 1569 | 1572 | -444 |
| pptx->odp | 1016 | 1018 | 165 | 764 | -851 |
| pdf->docx | 1022 | 1162 | 161 | 172 | -861 |

Reading: original answers are quantised to whole seconds (1 s sleep); new answers follow the x2t time
(~160 ms for ODF, ~0.77-1.57 s for PDF, which is x2t, see DIAG-x2t). Gain 0.44-1.56 s per sync
request; the order of the pairs ran first on the original, so part of the docx->pdf gap is warm-up
(original first run 4355 ms). Agrees with PKT-0068 (docx->odt 1018 -> 166 ms).

## Oracle
`.theseus/oracle/unit.sh` on this commit: 12 suites, 178 passed, 1 skipped.

## Not measured
- Co-edit round trip: round 1 changed only guards on error paths (PKT-0070); no hot-path change,
  baseline (server segment 4 ms p50) still stands. No differential co-edit run.
- DB load of the extra `taskResult.select` polls under 4-parallel converts.
- Users do not get the gain yet: the installed package still runs the original code.
