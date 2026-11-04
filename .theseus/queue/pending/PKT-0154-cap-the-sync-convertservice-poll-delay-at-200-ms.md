---
id: PKT-0154
title: Cap the sync ConvertService poll delay at 200 ms
type: refactor
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:r3:P2
depends_on: []
target:
  files:
  - DocService/sources/converterservice.js
  - tests/unit/converterService.tests.js
  create_in:
  - tests/unit
context:
  cards:
  - docservice
  references:
  - .theseus/diagnosis/DIAG-docservice.md
contract:
  preserve:
  - Existing tests keep passing; their assertions change only where the goal requires it, and the log says why
  forbidden: []
estimated:
  files: 2
  diff_lines: 60
  source: planner
acceptance:
  commands:
  - .theseus/oracle/unit.sh
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
Add CONVERT_SYNC_DELAY_MAX = 200 and use it as the cap in converterservice.js:169 instead of CONVERT_ASYNC_DELAY, with a unit test of the poll instants (50, 150, 350, 550, ...), then rerun SYNC=1 node .theseus/oracle/perf/e2e-convert.js 5 1 against the installed server and the worktree on :8099 and record that pptx->pdf p50 is <= the original's (~1010 ms) in the executor log.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P2`).
rounds/docservice-r3.md shows pptx->pdf 1006 ms original vs 1572 ms new because polls fall at 750 then 1550 ms. PKT-0116 measures the DB cost of the polls; a 200 ms cap adds at most 5 selects/s.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
