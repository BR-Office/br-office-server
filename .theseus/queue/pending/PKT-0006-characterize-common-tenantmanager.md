---
id: PKT-0006
title: Characterize Common tenantManager
type: characterize
priority: medium
module: common
origin:
  type: plan
  ref: plan:common:P1
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
  executor: null
  reviewer: null
---

## Goal
Pin tenant resolution from host (a.<baseDomain> → a, otherwise full domain), default tenant, multitenant flag and tenant config/secret lookup with unit tests that need no live service.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-common.md` (row `P1`).
Common/sources/tenantManager.js; see the common card pitfalls. Run with .theseus/oracle/unit.sh.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
