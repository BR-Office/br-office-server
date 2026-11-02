---
id: PKT-0029
title: Assess porting upstream crash fixes 81132 and 81576
type: investigate
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:P5
depends_on: []
target:
  files: []
  create_in:
  - .theseus/diagnosis
context:
  cards:
  - docservice
  references:
  - .theseus/diagnosis/DIAG-docservice.md
contract:
  preserve:
  - Existing tests keep passing unchanged
  forbidden: []
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
Locate the ONLYOFFICE commits for bug 81132 (client disconnect during file streaming crashes the process) and 81576 (SaveVersion not released after failed final assembly, prepare4shutdown hangs), describe the diff and whether it applies to Euro-Office main, for a human decision.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P5`).
Found by PKT-0017; 81132 is only on Euro-Office side branches such as release/v9.4.0, 81576 is absent from every Euro-Office ref.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
