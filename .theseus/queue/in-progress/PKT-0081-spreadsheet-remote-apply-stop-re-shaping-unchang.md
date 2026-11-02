---
id: PKT-0081
title: "Spreadsheet remote apply: stop re-shaping unchanged cells (StringRender fragment cache)"
type: refactor
priority: medium
module: sdkjs-cell

origin:
  type: packet
  ref: PKT-0072

depends_on: [PKT-0072]
requires: [documentserver, browser]

target:
  files:
    - external/sdkjs/cell/view/StringRender.js
  create_in: []

context:
  cards: [sdkjs-common]
  references:
    - .theseus/oracle/baseline.md
    - .theseus/oracle/perf/fonts-profile-2026-11-02.json

contract:
  preserve:
    - Rendered cell text (widths, wrapping, bidi) is identical before and after; existing tests keep passing
  forbidden: []

acceptance:
  commands:
    - node .theseus/oracle/perf/profile-fonts.js <samples-dir> external/sdkjs 3  # xlsx apply fonts self and HB_ShapeText crossings drop

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
On a spreadsheet remote change, do not re-shape the text of cells that did not change: cache shaped fragments per
(text, font) in `StringRender`/`FragmentShaper`, or keep text metrics of untouched cells. Target: xlsx remote apply
(20 changes, large-10k.xlsx) fonts self from ~290 ms to < 100 ms; `HB_ShapeText` from ~18 k to a few hundred.

## Essential context
- PKT-0072 (baseline.md, "libfont + WASM CPU by function"): 20 one-cell edits cause 18 318 shapes and ~100 k
  `FT_SetCMapForCharCode` crossings (~900 shapes per change), 257 ms under `FragmentShaper.shapeFragment` via
  `StringRender._measureChars`. Per-call cost is normal (~3 µs/shape); the count is the cost.
- Code is in sdkjs `cell/view` (no Atlas card for sdkjs-cell yet). `external/` is read-only: the change needs the sdkjs fork.
- Counts must come from the profiled run (hook counters), not from a coverage run (coverage coalesces cell redraws).

## Suggested plan

## Executor log
- attempt 1: acceptance failed: `node .theseus/oracle/perf/profile-fonts.js <samples-dir> external/sdkjs 3`

## Spawned packets

## Review

## Lessons for the Atlas
