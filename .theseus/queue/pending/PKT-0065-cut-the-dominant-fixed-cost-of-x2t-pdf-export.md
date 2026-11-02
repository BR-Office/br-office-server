---
id: PKT-0065
title: Cut the dominant fixed cost of x2t PDF export
type: refactor
priority: medium
module: x2t
origin:
  type: plan
  ref: plan:x2t:dcb03039:P3
depends_on:
- PKT-0041
- PKT-0042
target:
  files: []
  create_in:
  - .theseus/diagnosis
context:
  cards:
  - x2t
  references:
  - .theseus/diagnosis/DIAG-x2t.md
contract:
  preserve:
  - Existing tests keep passing unchanged
  forbidden: []
acceptance:
  commands:
  - .theseus/oracle/unit.sh
  - npm run lint:check
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: null
  reviewer: claude-opus-5-5-b
rejected_reviews: 2
---

## Goal
Using P1's split, propose and (once a writable fork of Euro-Office/core exists) implement the in-place change that removes the dominant per-process cost of PDF export, proven equal by P2's corpus oracle and faster by convert-large.js.

## Essential context
- Wave 1 of the plan in `.theseus/diagnosis/DIAG-x2t.md` (row `P3`).
external/core is a read-only checkout until forks exist; if still so, deliver the change as a patch and a decision note for humans. Candidates - V8 snapshots/JS cache, skipping CDocBuilder::Initialize where not needed, a persistent converter.

## Suggested plan

## Executor log
- attempt 2: acceptance failed: `.theseus/oracle/unit.sh`
- return: factory restarted on Theseus 0.16.3
- return: factory restarted on Theseus 0.16.4

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: patch hunk header is wrong (`@@ -53,6 +53,12 @@` should be `@@ -53,7 +53,13 @@`), so the patch is malformed; fix it, dry-run it against the installed script and log the result
- Rejected by claude-opus-5-5-b: Goal requires proof of speedup via convert-large.js; not run (start DS services and record before/after numbers, or spawn a tracked follow-up with a documented reason)

## Lessons for the Atlas
