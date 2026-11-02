---
id: PKT-0015
title: Measure end-to-end server latency
type: investigate
priority: high
module: docservice

origin:
  type: packet
  ref: PKT-0013

depends_on: []

target:
  files:
    - .theseus/oracle/baseline.md
  create_in:
    - .theseus/oracle/perf

context:
  cards: [docservice]
  references:
    - .theseus/oracle/baseline.md
    - .theseus/oracle/perf/bench-hotpaths.js

contract:
  preserve:
    - No change to the project's source code
  forbidden: []

acceptance:
  commands:
    - test -s .theseus/oracle/baseline.md

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
Add end-to-end server numbers to `.theseus/oracle/baseline.md`: latency (p50/p99) and throughput of open, co-edit round trip (change from user A seen by user B), save and ConvertService, with the full stack (PostgreSQL, Redis, RabbitMQ, x2t). Also the defect/crash rate from upstream history (github.com/Euro-Office/server).

## Essential context
PKT-0013 measured only in-process micro-benchmarks: the sandbox has Redis and psql but no RabbitMQ and no x2t binaries, and the local git history starts on 2026-10-28. Needs an environment with the full stack (e.g. the docker image) and permission to run it.

## Suggested plan
1. Start the stack; 2. drive N Socket.IO clients editing one document; 3. time ConvertService for docx/xlsx/pptx/pdf samples; 4. record scripts in `.theseus/oracle/perf/`.

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
