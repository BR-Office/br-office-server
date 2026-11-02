---
id: PKT-0008
title: Characterize Common storage-base with the fs backend
type: characterize
priority: medium
module: common
origin:
  type: plan
  ref: plan:common:P3
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
Pin storage key building (<specialDir>/<tenantPrefix><path>, backslash normalisation, tenant isolation) and persistentStorage inheritance using storage-fs in a temp dir.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-common.md` (row `P3`).
Common/sources/storage/storage-base.js and storage-fs.js.

## Suggested plan

## Executor log
- return: factory stopped by Rafael to redo the diagnosis against the real goals
- discard: superseded: its plan answered other goals

## Spawned packets

## Review

## Lessons for the Atlas
