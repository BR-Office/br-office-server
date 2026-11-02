---
id: PKT-0021
title: Load-test beyond 1000 sockets, valid saves under load, pptx-to-pdf outlier
type: investigate
priority: medium
module: docservice

origin:
  type: packet
  ref: PKT-0018

depends_on: []

target:
  files:
    - "[FILE]"
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
  executor: null
  reviewer: null
---

## Goal
Extend PKT-0018's load test: (1) find why 200 docs × 5 clients (direct to port 8000) gives no result in 300 s and where the ceiling is; (2) make saves under load valid (generate per-document changes that fit, so callback status 2 instead of 3) and time save assembly; (3) explain the one pptx → pdf conversion that took 124 s (deck-50.pptx, 1 of 3 runs).

## Essential context
See baseline.md section "Co-edit tail split, load test, large files (PKT-0018)" and perf/load-coedit.js, perf/convert-large.js. No source change; measurement only.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
