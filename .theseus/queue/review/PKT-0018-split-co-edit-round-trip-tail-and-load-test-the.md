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
  executor: claude-opus-5-5
  reviewer: null
resume: false
---

## Goal
Explain the tail of the co-edit round trip: p50 is about 0.1 s, but p99 is 1.1 s with 2 clients and 2.4 s with 4. Then load-test the server with many documents × many clients. Repeat open, convert and save on realistic (large) docx/xlsx/pptx files.

## Essential context
PKT-0015 measured the full stack with headless Chromium clients on a 2-CPU VM, using near-empty templates. The tail grows with the number of clients. The cause may be CPU starvation of the browser clients or sdkjs change batching rather than DocsCoServer, but nothing proves it yet. Splitting it needs a server-side timestamp per message (receive → broadcast), taken from DocService debug logs or from lightweight Socket.IO clients used instead of browsers. Runtime config needed: `allowPrivateIPAddress: true` in the container `local.json` (see baseline.md).

## Suggested plan
1. Add server-side timing (config or logs only, no source change) or use raw Socket.IO clients. 2. Rerun `perf/e2e-coedit.js` with that split. 3. Load-test with K documents × N clients. 4. Repeat convert, open and save on large samples.

## Executor log
- return: factory restarted: measurement permissions widened (Rafael authorized)
- block: agent `claude-opus-5-5` timed out after 30 min
- release: agent timeout raised to 90 min (load test); continue from the previous attempt
- claude-opus-5-5, attempt 2026-11-02 (resume): the scripts from the timed-out attempt (coedit-split.js, load-coedit.js, convert-large.js) were already committed by the factory; this attempt ran them and wrote the results. No source change; DocService DEBUG logging (log4js config, already set) gives the server timestamps.
- Decision: split the tail with browsers + server log timestamps (coedit-split.js), and load-test with raw Socket.IO clients (load-coedit.js) so the load generator does not starve the server (loadgen used ≤ 0.14 core).
- Finding: server segment (receive → broadcast) p99 ≤ 69 ms with 2 and 4 clients; the 4-client tail (p99 2.1 s) is in the sender's `type` (1.8 s) and receiver `down` (0.9 s) segments with the host at 99 % CPU, Chromium 74–76 % → client CPU starvation, not DocsCoServer.
- Finding: load to 100 docs × 10 clients (1 771 broadcasts/s) keeps ack/broadcast p99 ≈ 12 ms, DocService 0.28 core.
- Surprise: through nginx, 1 000 sockets fail (TransportError) — stock worker_connections 768; ran direct on port 8000.
- Surprise: all load-test saves end with callback status 3 (replayed change does not fit the doc), so save times under load are indicative only.
- Surprise: one deck-50.pptx → pdf took 124 s (1 of 3 runs), not explained.
- Not done: 200 × 5 gave no result within 300 s (not diagnosed). Requested follow-up in .theseus/spawn/ (ceiling, valid saves, pptx outlier).
- Raw numbers: .theseus/oracle/perf/results-2026-11-02.json.

## Spawned packets
- PKT-0021: Load-test beyond 1000 sockets, valid saves under load, pptx-to-pdf outlier

## Review

## Lessons for the Atlas
