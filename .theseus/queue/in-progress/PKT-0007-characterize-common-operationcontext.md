---
id: PKT-0007
title: Characterize Common operationContext
type: characterize
priority: medium
module: common
origin:
  type: plan
  ref: plan:common:P2
depends_on: []
target:
  files: []
  create_in:
  - tests/unit
context:
  cards:
  - common
  references:
  - .theseus/diagnosis/DIAG-common.md
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
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Pin Context.toJSON()/initFromTaskQueueData round-trip (cross-service wire format), initFromRequest and getCfg precedence (tenant over runtime over base).

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-common.md` (row `P2`).
Common/sources/operationContext.js; invariants in .theseus/atlas/common.md.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
