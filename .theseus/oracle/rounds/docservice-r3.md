# docservice round 3 measurement (PKT-0146, claude-opus-5-5, 2026-11-04)

Native .deb stack on this VM (2 CPU, 7 GB). Differential, same method as `docservice-r2.md`:
**original** = installed DocService (Euro-Office 9.3.7 build, 127.0.0.1:80, pre-round-1 code) against
**new** = this worktree's `DocService/sources/server.js` (commit 2d69a44: PKT-0068 backoff polling, PKT-0070 guards,
PKT-0113 storage fallbacks, PKT-0114 81132 port) run from source on :8099 against the same PostgreSQL, RabbitMQ,
FileConverter/x2t and config (`NODE_CONFIG='{"services":{"CoAuthoring":{"server":{"port":8099}}}}'`, other env from
`ds-docservice.service`). Script: `SYNC=1 node .theseus/oracle/perf/e2e-convert.js 5 1 <base>`; order new, original, new
(so warm-up does not favour one side).

## Sync ConvertService, request -> result URL (p50 / max, ms)

| Pair | original | new run 1 | new run 2 | reading |
|---|---|---|---|---|
| docx->pdf | 1012 / 1018 | 771 / 776 | 773 / 788 | -240 |
| docx->odt | 1016 / 1018 | 164 / 168 | 159 / 164 | -855 |
| xlsx->pdf | 2033 / 2079 (1 error) | 773 / 781 | **1565** / 1590 | unstable: 775 or 1575 |
| xlsx->ods | 1007 / 1009 | 169 / 179 | 423 / 766 | -590..-840 |
| pptx->pdf | 1006 / 1010 | **1572** / 1591 | **1610** / 2585 | **+566 regression** |
| pptx->odp | 1020 / 1025 | 162 / 174 | 158 / 164 | -860 |
| pdf->docx | 1009 / 1011 | 167 / 177 | 160 / 161 | -845 |

Errors: original 1 (xlsx->pdf), new 0.

## Finding: the backoff overshoots past ~0.8 s
`converterservice.js:160-169`: delay starts at `CONVERT_SYNC_DELAY_MIN` = 50 ms and doubles up to
`CONVERT_ASYNC_DELAY` = 1000 ms. Poll instants: 50, 150, 350, 750, 1550, 2550 ms. A conversion that ends between
~0.75 and ~1.0 s (pptx->pdf here, x2t ~0.8-1.0 s) was answered at ~1.0 s by the original (1 s fixed sleep) and is now
answered at ~1.55 s. The gain of round 1 holds for fast (ODF, <0.75 s) conversions and turns into a loss of up to
0.8 s for conversions just over 0.75 s. Capping the delay at ~200 ms bounds the lag at 200 ms for every length
(polls: 50, 150, 350, 550, ... at most 5 per s after the first 0.35 s).

## Oracle
`.theseus/oracle/unit.sh` on this commit: 14 suites, 186 passed, 1 skipped (two runs). A third run had 1 failing
test (flaky, not reproduced on rerun; same flakiness PKT-0114 noted on the integration check).

## Journeys (round 3 maps, docservice stages)
| journey | stage | ms p50 | share |
|---|---|---|---|
| save | save-delay (`savetimeoutdelay` sleep) | 5006 | 85.5 % |
| open-docx-10p | server-open-docservice | 538 | 6.5 % |
| open-docx-real | server-open-docservice | 206 | 4.1 % |
| open-docx-100p | server-open-docservice | 173 | - |
| open-docx-real-internet | server-open-docservice | 81 | 1.0 % |
| save | result / queue | 6 / 4 | 0.1 / 0.1 % |
| convert-docx-pdf | request / queue / result | 3 / 3 / 1 | 0.7 % total |
| coedit-remote | up / server / down | 0.1 / 3.0 / 0.8 | 3.6 % total |

Not measured again here: the journeys themselves (the factory measures them after every integrated change;
`scoreboard/journeys.jsonl` at b2867b3: save 5763, convert 1118, coedit 112, open-100p 5522 ms).
