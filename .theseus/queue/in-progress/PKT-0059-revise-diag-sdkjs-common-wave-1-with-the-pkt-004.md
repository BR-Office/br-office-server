---
id: PKT-0059
title: Revise DIAG-sdkjs-common Wave 1 with the PKT-0045 profile (fonts already parallel)
type: investigate
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0045

depends_on: []

target:
  files:
    - .theseus/diagnosis/DIAG-sdkjs-common.md
  create_in: []

context:
  cards: [sdkjs-common]
  references:
    - .theseus/oracle/baseline.md
    - .theseus/oracle/perf/client-profile-2026-11-02.json

contract:
  preserve:
    - "No code under external/ changes; only the diagnosis document"
  forbidden: []

acceptance:
  commands: []

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Update the plan in `.theseus/diagnosis/DIAG-sdkjs-common.md` with the PKT-0045 measurements: drop or reshape the Wave 1
"parallel font fetching / remove the 50 ms poll" refactor, and re-rank the hotspots (fonts CPU in libfont+WASM, drawings
for pptx, text measurement in cell remote apply).

## Essential context
- PKT-0045 (baseline.md "sdkjs/common share of open and remote apply") found that all document fonts are already requested
  at once (`CheckFontsNeedLoadingLoad`, served by the service worker); the 50 ms `check_loaded_list` poll adds only 6–71 ms
  per open. The font wait is the TTFB of the last font (0.3–1.4 s), below sdkjs.
- common is 22–35 % of open CPU (0.5–0.8 s), 5–6 % of Word remote apply, 22 % of spreadsheet remote apply (text measurement).
- The `conditional_on` of the DIAG ("P1 shows measurable user-visible time inside common") holds for CPU, not for font I/O.

## Suggested plan

## Executor log
claude-opus-5-5, 2026-11-02. Revised `.theseus/diagnosis/DIAG-sdkjs-common.md` only. Acceptance has no commands; `theseus validate` passes (0 errors).
Decisions:
- Verdict stays **refactor**: common is 22–35 % of open CPU, above the DIAG's 15 % downgrade threshold. Confidence low → medium; `conditional_on` now asks each Wave 1 refactor for a before/after gain with `profile-client.js` plus P2.
- Wave 1 "parallel font fetching" **dropped**; replacing the 50 ms poll with an event **not planned** (≤ 50 ms per open, touches event order before first render), kept as an optional later follow-up.
- Hotspots re-ranked: (1) font CPU (libfont + WASM, 250–300 ms per open and 336 ms of xlsx apply, every editor), (2) drawings on pptx open (~300 ms), (3) xlsx apply text measurement (folded into W1a). Word remote apply (common 5–6 %) left to DIAG-sdkjs-word.
- Added two Wave 1 investigate packets (W1a fonts CPU breakdown, W1b drawings breakdown) to the yaml plan rather than refactor packets: P1 attributes to files, not functions, so a refactor target cannot be named yet.
- Kept `wave: 0` and `base_commit` in the front matter (P2 is not done; the factory owns those fields).
Surprises:
- The packet's reference `.theseus/oracle/perf/client-profile-2026-11-02.json` and the PKT-0045 baseline section do **not exist** on this branch: PKT-0045's integration merges reported conflicts in baseline.md and the content was lost. I read them from commit 2fc5c20 and cited that commit in the DIAG. Requested a follow-up to restore them (spawn file `.theseus/spawn/PKT-0059-restore-the-pkt-0045-baseline-section-and-client.md`).
Not done: nothing from the goal; the restore of PKT-0045's files is outside target.files.

## Spawned packets

## Review

## Lessons for the Atlas
- sdkjs-common card: fonts are fetched in parallel (`CheckFontsNeedLoadingLoad`, service worker); the cost left in fonts is CPU (libfont + WASM glyph measuring), 250–300 ms per open.
- Integration merges with a conflict can drop a delivered section silently; check that a packet's references exist on main before building on them.
