---
id: PKT-0155
title: Repair the packet plan of .theseus/diagnosis/DIAG-x2t.md (not valid YAML)
type: chore
role: diagnostician
priority: critical
module: x2t
origin:
  type: plan
  ref: plan-repair:x2t:dcb03039:r3
depends_on: []
target:
  files:
  - .theseus/diagnosis/DIAG-x2t.md
  create_in: []
context:
  cards: []
  references: []
contract:
  preserve:
  - 'The meaning of every plan row: same packets, targets, dependencies and acceptance'
  forbidden: []
acceptance:
  commands:
  - theseus validate
budget:
  max_files_changed: 1
  max_diff_lines: 200
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5-b
  reviewer: null
---

## Goal
`theseus plan` cannot read the ```yaml block of the packet plan in `.theseus/diagnosis/DIAG-x2t.md`: .theseus/diagnosis/DIAG-x2t.md: packet plan: mapping values are not allowed in this context at line 31 column 180. Fix the YAML syntax only (quote strings that contain `: `, `#` or start with a special character), changing nothing the plan says. The factory checks at delivery that the plan parses.

## Essential context


## Suggested plan

## Executor log
- attempt 1: the spawn request PKT-0155-add-stage-layout-finish-webapps-to-covers-not-co.md still has template placeholders: fill in its target, contract and acceptance (rule R6)
- attempt 2: acceptance failed: `theseus validate`

## Spawned packets

## Review

## Lessons for the Atlas
