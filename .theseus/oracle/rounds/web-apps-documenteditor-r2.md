# web-apps-documenteditor, round 2 measurements (PKT-0106, 2026-11-03)

Native Euro-Office 9.3.7-1 stack on the factory VM (2 CPUs), Chromium via Playwright (`/opt/pw-browsers`).

## What changed since round 1
Nothing in code. Round 1 (PKT-0047, PKT-0048, PKT-0096) delivered measurements and oracles only.
`external/web-apps` and `external/web-apps.base` are the same commit (`d238e526`), so original and new are identical.

## Differential oracle (`bash .theseus/oracle/differential/web-apps-documenteditor.sh`)
**PASS (4 cases)**, every check `same` (dialogs, model, sentA/B, shown, ui, reopened, converted). Timings, ms (original | new, same build: noise):

| Case | open | join | edit | save | convert | reopen |
|---|---|---|---|---|---|---|
| text.docx | 3996 \| 3905 | 4288 \| 3866 | 4007 \| 3667 | 409 \| 405 | 389 \| 315 | 4116 \| 4313 |
| styles.docx | 3580 \| 3592 | 4151 \| 3946 | 3755 \| 3628 | 474 \| 475 | 447 \| 395 | 3760 \| 3564 |
| plain.txt | 3069 \| 3752 | 3081 \| 2953 | 3703 \| 3250 | 246 \| 258 | 335 \| 331 | 2929 \| 3115 |
| simple.rtf | 3034 \| 3523 | 3202 \| 3185 | 3376 \| 3579 | 314 \| 253 | 260 \| 257 | 3150 \| 3096 |

Identical code differs by up to ±700 ms on open: a gain under ≈ 0.5 s needs repeated runs (open-window.js, 5+ runs) to be shown.

## Open-sequence oracle (`bash .theseus/oracle/documenteditor-open.sh`)
PASS: toolbar 1 380, loaded 1 385, typed 6 617, saved 12 654 ms (round 1: toolbar 1.1–1.3 s, saved ≈ 11.2 s).

## Open window (`node .theseus/oracle/perf/open-window.js out.json medium-10p.docx large-100p.docx --runs 5`)
Marks p50, ms after goto (unprofiled / profiled):

| File | LoadDoc | Bin | Ready | PKT-0047 LoadDoc / Ready (unprofiled) |
|---|---|---|---|---|
| medium-10p.docx | 1 252 / 1 340 | 1 370 / 1 423 | 3 323 / 3 698 | 1 422 / 3 844 |
| large-100p.docx | 1 204 / 1 436 | 1 283 / 1 586 | 3 911 / 4 185 | 1 414 / 4 422 |

CPU goto → LoadDoc, ms p50 (10 p / 100 p): idle 224 / 288; browser parse+compile 171 / 220; native+GC 77 / 67;
vendor files (jQuery) 414 / 386; app.js DE.* 148 / 152; apps/common in app.js 166 / 150; Backbone+webpack 31 / 38;
sdk-all-min.js 72 / 68. Same split as PKT-0047 (web-apps ≈ 0.9 s of ≈ 1.1 s busy; sdkjs < 0.1 s). The ≈ 0.2 s lower marks
than PKT-0047 come with identical code: VM noise.
