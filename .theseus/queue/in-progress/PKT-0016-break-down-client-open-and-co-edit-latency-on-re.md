---
id: PKT-0016
title: Break down client open and co-edit latency on realistic documents
type: investigate
priority: medium
module: project

origin:
  type: packet
  ref: PKT-0014

depends_on: []

target:
  files:
    - .theseus/oracle/baseline.md
  create_in:
    - .theseus/oracle/perf

context:
  cards: [project]
  references: []

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
---

## Goal
Break down client open and co-edit latency on realistic documents.

## Essential context
PKT-0014 measured the client only on an empty docx with `.theseus/oracle/perf/client-perf.js`: open p50 3.1 s, remote apply p50 0.1 s / p90 0.36 s, typing p50 31 ms, heap 73 MB. Still missing: a split of open time (bundle and font load, Editor.bin download, x2t, render) from Performance API and network timings; the cause of the remote-apply tail; large docx and xlsx/pptx samples. The container must be started with `ALLOW_PRIVATE_IP_ADDRESS=true` or the example documents never load.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
