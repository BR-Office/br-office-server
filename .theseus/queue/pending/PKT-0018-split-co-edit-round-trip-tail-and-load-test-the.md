---
id: PKT-0018
title: Split co-edit round-trip tail and load-test the server
type: investigate
priority: medium
module: docservice

origin:
  type: packet
  ref: PKT-0015

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
    - .theseus/oracle/perf/e2e-coedit.js
    - .theseus/oracle/perf/e2e-convert.js

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
Explain the tail of the co-edit round trip: p50 is about 0.1 s, but p99 is 1.1 s with 2 clients and 2.4 s with 4. Then load-test the server with many documents × many clients. Repeat open, convert and save on realistic (large) docx/xlsx/pptx files.

## Essential context
PKT-0015 measured the full stack with headless Chromium clients on a 2-CPU VM, using near-empty templates. The tail grows with the number of clients. The cause may be CPU starvation of the browser clients or sdkjs change batching rather than DocsCoServer, but nothing proves it yet. Splitting it needs a server-side timestamp per message (receive → broadcast), taken from DocService debug logs or from lightweight Socket.IO clients used instead of browsers. Runtime config needed: `allowPrivateIPAddress: true` in the container `local.json` (see baseline.md).

## Suggested plan
1. Add server-side timing (config or logs only, no source change) or use raw Socket.IO clients. 2. Rerun `perf/e2e-coedit.js` with that split. 3. Load-test with K documents × N clients. 4. Repeat convert, open and save on large samples.

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
