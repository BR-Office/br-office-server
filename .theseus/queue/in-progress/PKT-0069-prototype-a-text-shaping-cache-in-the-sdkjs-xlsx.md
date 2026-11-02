---
id: PKT-0069
title: Prototype a text-shaping cache in the sdkjs xlsx print path
type: investigate
priority: medium
module: x2t

origin:
  type: packet
  ref: PKT-0054

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
    - .theseus/diagnosis/PKT-0054-xlsx-pdf-layout.md

contract:
  preserve:
    - "Existing tests keep passing unchanged"
    - "PDF output of the xlsx samples stays visually identical"
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
Prototype a text-shaping cache in the sdkjs xlsx print path.
PKT-0054 found that 79 % of asc_nativeGetPDF for a 25k-row sheet is WorksheetView._prepareCellTextMetricsCache,
mostly StringRender.measureString -> FragmentShaper.shapeFragment (HarfBuzz shaping per cell, no reuse).
Measure, on a local patched copy of sdkjs cell (sdk-all-min.js) loaded by x2t, how much a cache keyed by
(font, size, text) or skipping measurement for numbers that fit would save, with x2t-cpu.sh and
x2t-cpuprofile.js; say whether it is worth a fork of sdkjs.

## Essential context

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.16.4
- attempt 1: the executor's permissions refused: Bash: S=/tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0069/0204548c-a824-57b7-bea3-1783011bc81a/scratchp…

## Spawned packets

## Review

## Lessons for the Atlas
