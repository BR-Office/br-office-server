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
- attempt 3: acceptance failed: `theseus validate`
- Attempt 3: spawn request placeholders were already filled in cc38836 (target/contract/acceptance verified). The only `theseus validate` error is in DIAG-web-apps-documenteditor.md, outside target.files (R2), so it cannot be fixed here; it is covered by the spawn request PKT-0155-add-stage-layout-finish-webapps-to-covers-not-co.md, which must land before validate is green.
- Attempt (rework): filled the spawn request target/contract/acceptance (target DIAG-web-apps-documenteditor.md, acceptance `theseus validate`) per reviewer rejection (R6). Fixed my friction line to the keyed {hindered,helped,missing} format so validate accepts it.
- Remaining validate error (layout-finish-webapps stage coverage) is outside target; handled by the spawned request.
- Cause: the `context` value of the PKT-0143 follow-up row contained `(x2t-build.sh): `, so YAML read it as a mapping. Fix: wrapped that one scalar in single quotes (it has none inside); text unchanged. Checked with yaml.safe_load: the plan block parses.
- Surprise: `theseus validate` still reports 1 error, outside the target: open-docx-100p.md stage `layout-finish-webapps` missing from covers/not_covered of DIAG-web-apps-documenteditor.md. Requested a follow-up packet (spawn).
- `bash .theseus/oracle/differential/x2t.sh`: PASS (exit 0).
- block: the acceptance failed twice with the same output, so another attempt cannot fix it: acceptance failed: `theseus validate`

## Spawned packets
- PKT-0161: Add stage layout-finish-webapps to covers/not_covered of DIAG-web-apps-documenteditor.md

## Review

## Lessons for the Atlas
