---
id: PKT-0068
title: Shorten sync ConvertService polling delay (with characterization test update)
type: refactor
priority: medium
module: docservice

origin:
  type: packet
  ref: PKT-0063

depends_on:
  - PKT-0027

target:
  files:
    - DocService/sources/converterservice.js
    - tests/unit/converterService.tests.js
  create_in: []

context:
  cards: [docservice]
  references:
    - .theseus/diagnosis/DIAG-docservice.md

contract:
  preserve:
    - convertJson HTTP API (request/response shape) unchanged
    - Conversion timeout (utils.getConvertionTimeout) semantics unchanged: CONVERT_TIMEOUT once accumulated wait > timeout
    - converterService.tests.js may change only in the sleep-sequence expectations of the sync polling tests
  forbidden: []

acceptance:
  commands:
    - .theseus/oracle/unit.sh
    - npm run lint:check

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
---

## Goal
Replaces PKT-0063, which was blocked by a contract conflict. Make synchronous conversions return as soon as the task ends by polling with backoff (50 ms doubling to 1000 ms, accumulating actual waited time for the timeout check), and update the characterization expectations in tests/unit/converterService.tests.js that pin `sleeps` to `[1000, ...]` (lines ~129, 142-160, 212). Measure sync docx->odt latency before/after with .theseus/oracle/perf/e2e-convert.js.

## Essential context
- PKT-0063 tried this with only converterservice.js in target and "existing tests keep passing unchanged": 4 tests in tests/unit/converterService.tests.js fail because they assert exact sleep values (1000 each). The goal cannot be met without editing those expectations.
- A working diff (7+/2-) is described in PKT-0063's Executor log.
- Wave 1, row P3 of DIAG-docservice. Baseline PKT-0015: sync mode adds up to 900 ms per request.

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.16.3

## Spawned packets

## Review

## Lessons for the Atlas
