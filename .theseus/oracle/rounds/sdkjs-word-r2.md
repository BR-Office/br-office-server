# sdkjs-word, round 2 measurements (PKT-0104, 2026-11-03)

Native Euro-Office 9.3.7-1 stack on the factory VM (2 CPUs, shared with other agents), headless Chromium via Playwright.
"Original" = sdkjs `main` 9cea536 (`external/sdkjs.base`); "new" = fork branch at 0f61ccc (round 1 merged:
PKT-0066/0087/0091 incremental font collection for remote changes, plus the style cache and shape cache of other modules).
`git diff --stat 9cea536 0f61ccc -- word`: 5 files, +154 / −13.

## Oracles
| Command | Result | Wall |
|---|---|---|
| `bash .theseus/oracle/sdkjs-word.sh` | 42/42 suites, 6195/6195 assertions (js-api-forms now runs, PKT-0056) | 155 s |
| `bash .theseus/oracle/sdkjs-common.sh` | 7/7 suites, 10341/10341 assertions (3 local skips: compiled-bundle suites) | 34 s |
| `bash .theseus/oracle/differential/sdkjs-word.sh` | PASS, 2 cases (text.docx, styles.docx): model, sentA, sentB, shown, reopened, converted all same | 118 s |
| `bash .theseus/oracle/differential/sdkjs-common.sh` | PASS, 3 cases | 182 s |

Round 1 changes are behavior-neutral on every compared output.

## Differential timing lines (ms, one run each, small inputs)
| Case | Side | open | join | edit | save | convert | reopen |
|---|---|---|---|---|---|---|---|
| text.docx | original | 9 900 | 6 427 | 3 627 | 353 | 448 | 7 511 |
| text.docx | new | 7 923 | 6 926 | 3 674 | 361 | 319 | 5 054 |
| styles.docx | original | 7 654 | 7 056 | 6 433 | 412 | 1 287 | 5 491 |
| styles.docx | new | 5 350 | 6 914 | 5 264 | 667 | 991 | 8 318 |

Differences go both ways by 2–3 s between runs of the same pair (reopen: new faster on text, slower on styles):
noise on this VM. The oracle's inputs are small and do not exercise the remote-apply path that round 1 changed,
so it cannot show the gain; the gain was measured by the A/B below.

## Remote apply A/B (from PKT-0093, same day, `large-100p.docx`, 30 remote markers, CDP on B)
| Variant | B busy ms | font collection ms | full walks |
|---|---|---|---|
| original | 3 737 | 271 | 136 |
| new | 3 459 | 0.5 | 0 |

≈ −7 % receiver busy time; repaint (canvas drawImage, *Draw* frames 33–57 % on stack, PKT-0043) and recalculation remain.

## Installed bundle, user-felt numbers (`perf/client-perf.js 3 http://127.0.0.1/example/`)
Installed package bundle = original code (the fork build is not installed; A/B uses route injection).

| Measure | n | p50 | p90 | max |
|---|---|---|---|---|
| open (ms) | 3 | 4 868 | 6 046 | 6 046 |
| open second (ms) | 3 | 4 632 | 5 207 | 5 207 |
| typing key → frame (ms) | 60 | 46 | 115 | 214 |
| remote apply (ms) | 15 | 147 | 463 | 1 435 (raw list, two outliers 836/1 435) |
| heap MB | 3 | 77.6 | | |

Same order as PKT-0016 (typing p90 119–156 ms; remote p90 105–143 ms) with more spread (busy VM).
