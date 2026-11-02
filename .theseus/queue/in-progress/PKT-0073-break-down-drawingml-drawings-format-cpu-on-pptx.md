---
id: PKT-0073
title: Break down DrawingML (Drawings/Format) CPU on pptx open
type: investigate
priority: medium
module: sdkjs-common
origin:
  type: plan
  ref: plan:sdkjs-common:dcb03039:W1b
depends_on:
- PKT-0045
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
  - Existing tests keep passing; their assertions change only where the goal requires it, and the log says why
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
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
With profile-client.js on pptx 50 (and docx/xlsx for comparison), attribute the ~300 ms drawings self time of pptx open to functions in common/Drawings/Format and name refactor candidates with an expected gain, or state that none exceeds 50 ms. Coordinate with the sdkjs-slide diagnosis.

## Essential context
- Wave 1 of the plan in `.theseus/diagnosis/DIAG-sdkjs-common.md` (row `W1b`).
PKT-0045 put drawings at 296 ms (35 % of common) on pptx open and 55-88 ms on docx/xlsx.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
