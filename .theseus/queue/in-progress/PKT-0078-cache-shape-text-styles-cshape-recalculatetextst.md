---
id: PKT-0078
title: Cache shape text styles (CShape.recalculateTextStyles + style-cache sha256) on pptx open
type: refactor
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0073

depends_on: [PKT-0073]

target:
  files:
    - external/sdkjs/common/Drawings/Format/Shape.js
    - external/sdkjs/word/Editor/Styles/style-cache.js
  create_in: []

context:
  cards: [sdkjs-common]
  references:
    - .theseus/oracle/baseline.md
    - .theseus/oracle/perf/drawings-functions-2026-11-02.json

requires: [documentserver, browser]

contract:
  preserve:
    - "Text styles resolved for every shape (placeholder inheritance master -> layout -> slide, theme fonts, lstStyle) stay identical"
    - "Existing sdkjs tests keep passing"
  forbidden: []

acceptance:
  commands:
    - "bash .theseus/oracle/sdkjs-common.sh"

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
On pptx open, cut the ~143 ms (inclusive, median of 3, deck-50.pptx) spent in `CShape.recalculateTextStyles` /
`CShape.Get_Styles` (common/Drawings/Format/Shape.js), of which ~91 ms is `CMemory.sha256` hashing called from
`word/Editor/Styles/style-cache.js` (`StyleCache.getKey`). Each shape builds a fresh `CStyles` (new `CStyle("defaultStyle")`,
master/layout/placeholder levels) inside `ExecuteNoHistory`, then hashes it. Cache per (master, layout, placeholder type/idx,
txBody lstStyle) so shapes sharing a hierarchy reuse one object, or make the style-cache key cheaper than a sha256 of the
serialized styles. Expected gain 50-100 ms per 50-slide open; measure before/after with
`node .theseus/oracle/perf/drawings-functions.js <dir> external/sdkjs 3`.

## Essential context
- PKT-0073 breakdown in `.theseus/oracle/baseline.md` (section "drawings by function").
- `external/sdkjs` is a read-only clone: this refactor needs the sdkjs fork (not created yet) or a patched copy
  installed into the Document Server for measurement. Coordinate with the sdkjs-slide diagnosis (callers:
  `SlideLayout.recalculate`, `MasterSlide.recalculate`, `Slide.recalculateSpTree`, `CDocumentContent.GetStyles`).

## Suggested plan

## Executor log
- return: container restarted; factory restarted on Theseus 0.17.0
- return: disk filled up; factory restarted on Theseus 0.17.1

## Spawned packets

## Review

## Lessons for the Atlas
