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
- **Result: not delivered — goal and contract conflict.** Implemented backoff polling in `convertByCmd` (`CONVERT_SYNC_DELAY_MIN = 50`, `delay` doubling to `CONVERT_ASYNC_DELAY`=1000, `waitTime += delay`, so timeout semantics are kept). Unit oracle then failed 4 tests in `tests/unit/converterService.tests.js` (outside target) that pin `sleeps` to `[1000]`, `[1000,1000,1000]`, `[1000,1000,1000,1000]`. Without the change: 178 passed, 1 skipped.
- Contract `preserve: Existing tests keep passing unchanged` + target limited to converterservice.js means *any* shorter delay breaks the contract. Reverted the code change; no source diff is delivered.
- Spawned a replacement request (`.theseus/spawn/PKT-0063-shorten-sync-convertservice-polling-delay-with-c.md`) that adds the test file to target and narrows the preserve clause to the sleep-sequence expectations.
- Not done: perf measurement with e2e-convert.js (no change to measure).
- Lint: 0 errors, 1 pre-existing warning in AdminPanel (unrelated).

## Spawned packets

## Review

## Lessons for the Atlas
