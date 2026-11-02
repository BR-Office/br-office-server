---
id: PKT-0022
title: Record PKT-0021 load/save/convert findings in baseline and perf scripts
type: investigate
priority: medium
module: docservice

origin:
  type: packet
  ref: PKT-0021

depends_on: [PKT-0018, PKT-0021]

target:
  files:
    - .theseus/oracle/baseline.md
    - .theseus/oracle/perf/load-coedit.js
    - .theseus/oracle/perf/convert-large.js
  create_in: []

context:
  cards: [docservice]
  references: []

contract:
  preserve:
    - "[WHAT MUST NOT CHANGE]"
  forbidden: []

acceptance:
  commands: []

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
Copy into baseline.md (PKT-0018 section, once merged) and perf/ the findings in the PKT-0021 Executor log: (1) load-coedit.js must send `unLockDocument` from the first client after each doc opens, and must time out `saveLock` waits (without this, any run whose sequential open phase exceeds `expire.lockDoc` = 30 s hangs); add the 200x5 and 200x10 rows; (2) convert-large.js must wait for the converter queue to drain (or run before load tests), since FileConverter maxprocesscount=1 queues conversions behind save assembly; replace the "124 s outlier" note with the explanation. Measurement-only, no source change.

## Essential context

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.14.1
- claude-opus-5-5, 2026-11-02. Changed only the 3 target files; no source change, no service run.
- Decision: PKT-0021's patched scratchpad copies were gone, so I re-implemented the two fixes from its log: `unLockDocument` from client 0 after each doc's clients are all ready; `saveLock` wait raced against 10 s, counted as `errors.noLockReply`. Did not add the stderr open/change timestamps (diagnostic only).
- Decision: convert-large.js drains with a probe (smallest file -> own format, repeated until < 3 s, max 15 min) instead of only a comment, so a run after a load test is not polluted; header comment says to run on an idle server or before load tests.
- baseline.md: added 200x5 / 200x10 rows (postgres 0.25 in the text, the table has no postgres column), replaced "not diagnosed" and the 124 s outlier note with the explanations, updated the Gaps row to point at PKT-0023.
- Not done: scripts not re-run against the server (measurement-only recording packet, acceptance empty); `node --check` passes on both.
- Surprise: acceptance is empty and contract.preserve is still the template placeholder.

## Spawned packets

## Review

## Lessons for the Atlas
