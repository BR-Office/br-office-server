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

## Spawned packets

## Review

## Lessons for the Atlas
