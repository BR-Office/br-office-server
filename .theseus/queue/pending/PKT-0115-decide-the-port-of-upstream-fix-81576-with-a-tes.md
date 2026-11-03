---
id: PKT-0115
title: Decide the port of upstream fix 81576 with a test plan
type: investigate
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:r2:P3
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
  - Existing tests keep passing; their assertions change only where the goal requires it, and the log says why
  forbidden: []
estimated:
  files: 1
  diff_lines: 120
  source: planner
acceptance:
  commands:
  - test -s .theseus/diagnosis/PKT-81576-test-plan.md
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
Write .theseus/diagnosis/PKT-81576-test-plan.md describing how SaveVersion is released after a failed final assembly in commit 8585bcf4, which save-state semantics it changes, and the characterization tests needed before porting, for a human decision.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P3`).
PKT-0029 rated it medium risk; patch in .theseus/diagnosis/PKT-0029-upstream-81576.patch; shutdown.js waits for SaveVersion rows to reach 0.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
