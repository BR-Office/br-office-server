---
id: PKT-0043
title: Profile docx open and remote apply inside sdkjs word
type: investigate
priority: medium
module: sdkjs-word
origin:
  type: plan
  ref: plan:sdkjs-word:dcb03039:P1
depends_on: []
target:
  files:
  - .theseus/oracle/baseline.md
  create_in:
  - .theseus/oracle/perf
context:
  cards:
  - sdkjs-word
  references:
  - .theseus/diagnosis/DIAG-sdkjs-word.md
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
With the native stack and the PKT-0016 samples (docx 10 p and 100 p), record Chrome CPU profiles (Playwright + CDP Profiler) of open (Editor.bin received → load complete), typing, and receiver apply of remote changes. Attribute self and inclusive time to word submodules (Serialize2 reader, CDocument.Recalculate/paragraph/table layout, styles, collab apply, Drawing render) versus sdkjs/common, fonts and browser. Use the unminified develop bundle or source maps so frames are named. Add the table to baseline.md.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-sdkjs-word.md` (row `P1`).
baseline.md PKT-0016 shows 1.9–2.4 s after Editor.bin and apply p90 105–143 ms, not split. The atlas card sdkjs-word lists the call path. This decides which refactors to plan and whether any kernel is a migration candidate.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
