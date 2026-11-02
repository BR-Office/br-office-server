---
id: PKT-0063
title: Shorten the synchronous ConvertService polling delay
type: refactor
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:P3
depends_on:
- PKT-0027
target:
  files:
  - DocService/sources/converterservice.js
  create_in: []
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
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Return synchronous conversions as soon as the task ends (short or backoff polling, e.g. 50 ms growing to 1 s) without changing the API or the timeout, and measure sync docx->odt latency before and after with .theseus/oracle/perf/e2e-convert.js.

## Essential context
- Wave 1 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P3`).
Baseline PKT-0015 - sync mode adds up to 900 ms per request. Keep DB load reasonable (taskResult.select per poll).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
