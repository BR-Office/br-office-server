---
id: PKT-0045
title: Profile the sdkjs common share of open and remote apply, with font waterfall
type: investigate
priority: medium
module: sdkjs-common
origin:
  type: plan
  ref: plan:sdkjs-common:dcb03039:P1
depends_on: []
target:
  files:
  - .theseus/oracle/baseline.md
  create_in:
  - .theseus/oracle/perf
context:
  cards:
  - sdkjs-common
  references:
  - .theseus/diagnosis/DIAG-sdkjs-common.md
contract:
  preserve:
  - Existing tests keep passing unchanged
  forbidden: []
allowed_commands:
- '*'
acceptance:
  commands: []
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: null
  reviewer: null
---

## Goal
With the native stack and the PKT-0016 samples (docx 10p/100p, xlsx 10k, pptx 50), record Chrome CPU profiles (Playwright + CDP) of open (Editor.bin received → load complete) and receiver apply. Attribute self/inclusive time to sdkjs/common submodules (fonts/GlobalLoaders+libfont, drawings, charts, serialize, coauth/History/TableId) vs editor-specific code vs browser. Record the font waterfall (request/response times per font file and idle gaps from the 50 ms check_loaded_list poll) and the onLoadFonts client log. Use unminified develop sources or source maps. Add the table to baseline.md.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-sdkjs-common.md` (row `P1`).
baseline.md PKT-0016 shows 1.5–2.4 s after Editor.bin and 14–25 font files per open, not split. GlobalLoaders.js:184-263 loads fonts serially with a 50 ms polling timer. Coordinate with sdkjs-word P1 (same harness) to avoid duplicate work.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
