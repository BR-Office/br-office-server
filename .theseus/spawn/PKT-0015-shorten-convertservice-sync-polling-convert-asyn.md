---
id: SPAWN
title: Shorten ConvertService sync polling (CONVERT_ASYNC_DELAY 1 s)
type: refactor
priority: medium
module: docservice

origin:
  type: packet
  ref: PKT-0015

depends_on: []

target:
  files:
    - DocService/sources/converterservice.js
  create_in: []

context:
  cards: [docservice]
  references:
    - .theseus/oracle/baseline.md
    - .theseus/oracle/perf/e2e-convert.js

contract:
  preserve:
    - ConvertService request and response format and error codes
    - Async mode behaviour
  forbidden: []

acceptance:
  commands:
    - sh .theseus/oracle/unit.sh

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
Synchronous ConvertService (`async: false`) answers only in whole seconds. The cause is `CONVERT_ASYNC_DELAY = 1000` in `DocService/sources/converterservice.js:49,163`, so a 140 ms conversion is returned after at least 1 s. Reduce this latency without changing the API, for example with a shorter or adaptive polling interval, or by waiting on the task completion event.

## Essential context
Measured in PKT-0015 (baseline.md, section "End-to-end server"): sync mode gives p50 1 012 ms for conversions whose real time is 136–175 ms, and 2 016 ms for pptx→pdf, whose real time is about 1.17 s.

## Suggested plan
1. Characterize the current timeout behaviour (`convertTimeout`, how `waitTime` is counted). 2. Replace the fixed 1 s sleep with a shorter interval, a backoff or an event. 3. Rerun `SYNC=1 node .theseus/oracle/perf/e2e-convert.js` to show the gain.

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
