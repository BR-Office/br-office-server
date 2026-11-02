---
id: SPAWN
title: Carry the shapeFragment cache in sdkjs source and re-measure with the V8 snapshot
type: port-upstream
priority: medium
module: x2t

origin:
  type: packet
  ref: PKT-0069

depends_on: []
requires: [documentserver]

target:
  files:
    - ".theseus/oracle/perf/sdkjs-shape-cache.py"
  create_in:
    - .theseus/diagnosis
    - .theseus/oracle/perf

context:
  cards: [x2t]
  references: []

contract:
  preserve:
    - "[WHAT MUST NOT CHANGE]"
  forbidden: []

acceptance:
  commands:
    - "[ORACLE COMMAND]"

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
PKT-0069 prototyped a memo cache on FragmentShaper.shapeFragment (key: font name, size, bold|italic, PPI,
code points; replay grapheme/width per char) in a copy of the built sdkjs/cell/sdk-all.js: 16-26 % less x2t CPU
on large xlsx -> pdf, 521/521 pages pixel-identical. Port it to the sdkjs source (cell/view/StringRender.js),
build, regenerate sdk-all.bin/cache, re-measure with x2t-cpu.sh and pdftoppm page comparison, and prepare
it as an upstream PR or a carried patch. Reference: .theseus/diagnosis/PKT-0069-shape-cache.md,
.theseus/oracle/perf/sdkjs-shape-cache.py.

## Essential context

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
