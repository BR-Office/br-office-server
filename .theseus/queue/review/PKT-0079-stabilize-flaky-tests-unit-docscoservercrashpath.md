---
id: PKT-0079
title: Stabilize flaky tests/unit/docsCoServerCrashPaths.tests.js
type: investigate
priority: medium
module: docservice

origin:
  type: packet
  ref: PKT-0075

depends_on: []

target:
  files:
    - "tests/unit/docsCoServerCrashPaths.tests.js"
  create_in: []

context:
  cards: [docservice]
  references: []

contract:
  preserve:
    - "Production code under DocService/ and Common/ (test-only fix)"
    - "The behaviours asserted by docsCoServerCrashPaths.tests.js (no test removed or weakened)"
  forbidden:
    - "jest.config / retry settings to mask the flake"

acceptance:
  commands:
    - ".theseus/oracle/unit.sh"
    - "for i in 1 2 3 4 5; do .theseus/oracle/unit.sh || exit 1; done"
    - "npm run lint:check"

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Find and fix the cause of the intermittent failure of tests/unit/docsCoServerCrashPaths.tests.js so that `.theseus/oracle/unit.sh` is deterministic.
Stabilize flaky tests/unit/docsCoServerCrashPaths.tests.js.

## Essential context
- Seen by PKT-0075 (no JS changes): 3 runs of `.theseus/oracle/unit.sh` gave rc 0,1,0; 1 failed test in that suite only. Likely timing/handle-dependent (Jest also reports open handles).

## Suggested plan
1. Run the suite in a loop to reproduce; inspect timers/handles left open.
2. Make timing deterministic (fake timers or awaited cleanup) in the test file only.

## Executor log
- Reproduced: 1 failure in 6 isolated runs, always `io.use handshake auth > no token ... next() without error` (the first test touching io.use).
- Cause: the io.use handler calls `next()` only after `ctx.initTenantCache()` (and `checkJwt` for the token test). The test waited a fixed `flush()` (5 / 10 setImmediate ticks); on a cold first call that async work can take longer, so `next` was not yet called when asserted.
- Fix (test only): helper `runUseHandler` wraps `next` and returns a promise resolved when `next` is called; both io.use tests await it. Assertions unchanged; no jest config/retry change; no production code touched.
- Verified: 15/15 isolated runs green, oracle 1 + 5x loop green, lint 0 errors (1 pre-existing warning in AdminPanel, outside target).
- Not done: the Jest open-handle warning was not investigated separately; it did not cause the failure.

## Spawned packets

## Review

## Lessons for the Atlas
