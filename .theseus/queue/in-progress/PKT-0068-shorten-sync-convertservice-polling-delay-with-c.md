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
  executor: claude-opus-5-5
  reviewer: null
resume: false
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
- Done: `convertByCmd` sync loop now sleeps `delay` starting at `CONVERT_SYNC_DELAY_MIN = 50` ms, doubling up to `CONVERT_ASYNC_DELAY` (1000); `waitTime += delay` (actual waited time), so the strict `waitTime > getConvertionTimeout` check is unchanged.
- Tests: only `sleeps` expectations changed (`[1000]`→`[50]` x2, `[1000,1000,1000]`→`[50,100,200]`, timeout case `[1000 x4]`→`[50,100,200,400,800,1000,1000]` since cumulative 50..2550 ≤ 3000, 3550 > 3000) plus the matching test title/comment.
- Acceptance: unit oracle 178 passed / 1 skipped; lint 0 errors, 1 pre-existing AdminPanel warning.
- Not done: before/after latency with `.theseus/oracle/perf/e2e-convert.js` — no stack on :8080 and no docker daemon in this worktree environment. Expected gain: a task ending in < 1 s now returns after ~50-350 ms instead of 1000 ms. Trade-off: up to ~6 extra DB selects in the first 1.5 s per sync request.
- block: the reviewer found an external blocker: The before/after latency measurement with .theseus/oracle/perf/e2e-convert.js needs a running DocService stack (:8080 or a docker daemon); the operator or factory must provide one, or drop the measurement from the goal. The code change itself is approvable.
- release: Theseus 0.16.4 tells agents the DocService is up (native .deb on 127.0.0.1:80); the block was a wrong port, not a missing stack
- attempt 1: the spawn request PKT-0068-make-e2e-convert-js-work-against-the-native-jwt.md still has template placeholders: fill in its target, contract and acceptance (rule R6)

## Spawned packets

## Review

## Lessons for the Atlas
