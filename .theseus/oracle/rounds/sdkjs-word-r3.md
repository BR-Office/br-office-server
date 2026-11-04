# sdkjs-word, round 3 measurements (PKT-0149, 2026-11-04)

Native Euro-Office 9.3.7-1 stack on the factory VM (2 CPUs, shared), headless Chromium via Playwright.
"Original" = sdkjs `main` 9cea536 (`external/sdkjs.base`); "new" = fork 0f61ccc (`external/sdkjs`, branch pkt/PKT-0149,
no local change). The fork has **not moved since round 2**: round 2 packets (PKT-0109, PKT-0110) delivered a measurement
script and an oracle case, no sdkjs change. `git diff --stat 9cea536 0f61ccc -- word`: 5 files, +154 / −13 (round 1 only).

## Oracles (all run here, sequentially, same machine)
| Command | Result | Wall |
|---|---|---|
| `bash .theseus/oracle/sdkjs-word.sh` | 42/42 suites, 6195/6195 assertions | 148 s |
| `bash .theseus/oracle/sdkjs-common.sh` | 7/7 suites, 10341/10341 assertions | 24 s |
| `bash .theseus/oracle/differential/sdkjs-word.sh` | PASS, 3 cases (text, styles, large): model, sentA, sentB, shown, reopened, converted all same | 233 s |
| `bash .theseus/oracle/differential/sdkjs-common.sh` | PASS, 3 cases | 115 s |

## Differential timing, large.docx (≈ 100 pages, A types 30 chars on 5 pages, B receives; median of 3 runs)
| Side | open | join | type | lat | latMax | recv | long | save | convert | reopen |
|---|---|---|---|---|---|---|---|---|---|---|
| original | 7 488 | 7 342 | 6 107 | 154 | 968 | 5 | 824 | 1 724 | 1 069 | 7 469 |
| new | 4 156 | 5 153 | 5 269 | 92 | 795 | 4 | 691 | 320 | 365 | 3 976 |

PKT-0110 measured `long` moving 485–698 ms between runs of the same build and lat 124 vs 126; the open/save/reopen
gaps here (original first, cold caches) are ordering and load, not code. Only the round 1 font change differs, and it
was worth ≈ 7 % of B busy time (PKT-0093): within this noise. No speed claim is made from this line.

## Repaint scope (`node .theseus/oracle/perf/word-repaint.js large-100p.docx external/sdkjs 1`, 20 events per side)
| Per event | local p50 | local mean | remote p50 | remote mean | PKT-0109 local mean | PKT-0109 remote mean |
|---|---|---|---|---|---|---|
| pages recalculated | 1 | 1 | 2 | 10.1 | 1.5 | 10.2 |
| recalc ms (remote fast path not timed) | 11.9 | 12.6 | 0 | 21.1 | 18.5 | 35.5 |
| `ClearCachePages` (all pages) | 1 | 1 | 2 | 2 | 1 | 2 |
| pages re-rasterised | 2 | 1.6 | 2 | 2 | 1.8 | 2 |
| OnPaint ms (incl. re-raster) | 20.1 | 20.4 | 25.7 | 25.4 | 30.1 | 38.5 |
| drawImage calls | 3 846 | 2 993 | 3 954 | 3 849 | 3 470 | 3 951 |
| key → text in model ms | 38 | 42 | 272 | 271 | 75 | 404 |

Same shape as PKT-0109 (absolute ms lower: quieter VM). Confirmed again: `Send_Changes` clears all page caches once per
local key and twice per remote event (20× / 40× call sites), and 2 of 20 remote events fell back to
`RecalculateWithParams` → timer loop (`ContinueRecalculationLoop`, 200 `OnRecalculatePage` from the loop vs 65 on the fast path).
Both are already queued: PKT-0144 (lock redraw) and PKT-0145 (fallback trace), pending.

## Journey stages owned by sdkjs-word (round 3 maps, integrated build)
| Journey | Stage | ms p50 | share |
|---|---|---|---|
| open-docx-100p | layout-finish-paint | 1 250 | 27.0 % |
| open-docx-10p | client-open-word | 1 057 | 12.7 % |
| open-docx-real-internet | client-open-word | 839 | |
| open-docx-10p | layout-finish-paint | 741 | 8.9 % |
| open-docx-real | client-open-word | 537 | |
| open-docx-real-internet | layout-finish-paint | 490 | |
| open-docx-100p | client-open-word | 473 | |
| open-docx-real | layout-finish-paint | 471 | |
| coedit-remote | b-paint | 15.5 | 14.5 % |
| typing | paint | 12.5 | 24.7 % |
| coedit-remote | a-input | 4.0 | 3.7 % |
| typing | handler | 3.4 | 6.7 % |
| coedit-remote | b-apply | 3.3 | 3.1 % |

Open is two to three orders of magnitude more user time in this module than typing or co-edit (typing p50 51 ms and
co-edit 107 ms are under ~100 ms; open 100p is 4.6 s, of which 1.25 s is word layout after load-complete).
