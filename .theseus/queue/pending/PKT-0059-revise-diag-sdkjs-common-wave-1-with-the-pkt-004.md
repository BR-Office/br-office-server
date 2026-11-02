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
  executor: null
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

## Spawned packets

## Review

## Lessons for the Atlas
