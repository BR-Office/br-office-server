---
id: PKT-0054
title: Investigate xlsx to pdf layout cost in x2t (50k rows 44 s)
type: investigate
priority: medium
module: x2t

origin:
  type: packet
  ref: PKT-0041

depends_on: []
requires: [documentserver]

target:
  files: []
  create_in:
    - .theseus/diagnosis
    - .theseus/oracle/perf

context:
  cards: [x2t]
  references:
    - .theseus/diagnosis/PKT-0041-x2t-pdf-split.md

contract:
  preserve:
    - "Existing tests keep passing unchanged"
  forbidden: []

acceptance:
  commands: []

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5-b
  reviewer: null
---

## Goal
PKT-0041 measured big-50k.xlsx -> pdf at ~50 s, 44 s of it in the JS layout/Execute phase of doctrenderer (xlsx -> xlsx was 6.5 s in PKT-0018). Profile where the cell layout/drawing time goes (V8 --prof or perf with perf-map, or sdkjs cell print path) and say whether it is page setup (e.g. no print area / fit-to-page), font measurement, or drawing-command volume.

## Essential context
Run with `.theseus/oracle/perf/x2t-split.sh`; samples from `make-samples.py`.

## Essential context

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
