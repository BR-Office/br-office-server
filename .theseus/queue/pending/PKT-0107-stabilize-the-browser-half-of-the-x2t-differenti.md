---
id: PKT-0107
title: Stabilize the browser half of the x2t differential oracle
type: refactor
priority: medium
module: x2t
origin:
  type: plan
  ref: plan:x2t:dcb03039:r2:P1
depends_on: []
target:
  files:
  - .theseus/oracle/differential/x2t-run.cjs
  create_in:
  - .theseus/oracle/differential
  - tests/unit
context:
  cards:
  - x2t
  references:
  - .theseus/diagnosis/DIAG-x2t.md
contract:
  preserve:
  - Existing tests keep passing; their assertions change only where the goal requires it, and the log says why
  forbidden: []
requires:
- documentserver
- browser
estimated:
  files: 1
  diff_lines: 80
  source: planner
acceptance:
  commands:
  - bash .theseus/oracle/differential/x2t.sh
  - theseus validate
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: null
  reviewer: null
resume: true
---

## Goal
Make the browser part of x2t.sh stable when both sides run the same binary - the scripted local edit on text-10p.docx sometimes ends as "Local edit old" instead of "Local edit bold", producing 7 "original side itself unstable" differences (model, sentA, shown, saved, converted.pdf, converted.odt, reopened). Wait for the edit to be applied (model text check) before capturing; prove with two consecutive passing runs of x2t.sh.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-x2t.md` (row `P1`).
PKT-0103 run 1 in .theseus/oracle/rounds/x2t-r2.md. PKT-0094 already fixed a similar spell-check race with stableShown(). Do not add entries to x2t.intended to hide noise.

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.23.2, work kept

## Spawned packets

## Review

## Lessons for the Atlas
