---
id: PKT-0027
title: Characterize ConvertService sync and async flow in converterservice.js
type: characterize
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:P1
depends_on: []
target:
  files: []
  create_in:
  - tests/unit
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
Pin the behaviour of convertJson/convertXml in sync (async=false) and async mode, including the polling loop, timeout (CONVERT_TIMEOUT) and error statuses, with taskResult and the queue mocked.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P1`).
The loop is at DocService/sources/converterservice.js:156-170 with CONVERT_ASYNC_DELAY=1000 (line 49). Baseline PKT-0015 shows sync answers in whole seconds.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
