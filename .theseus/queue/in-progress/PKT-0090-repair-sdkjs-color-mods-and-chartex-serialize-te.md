---
id: PKT-0090
title: Repair sdkjs color-mods and chartEx-serialize test pages so they join the common oracle
type: characterize
priority: low
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0058

depends_on: []
requires: [browser]

target:
  files:
    - external/sdkjs/tests/common/color-mods/color-mods.js
    - external/sdkjs/tests/common/charts/chartEx-serialize.html
    - external/sdkjs/tests/common/charts/chartEx-serialize.js
    - .theseus/oracle/sdkjs-common-run.cjs
    - .theseus/atlas/sdkjs-common.md
  create_in: []

context:
  cards: [sdkjs-common]
  references: []

contract:
  preserve:
    - "The four upstream common/api suites keep passing"
    - "No change to sdkjs product code (only the test pages and the oracle)"
  forbidden: []

acceptance:
  commands:
    - .theseus/oracle/sdkjs-common.sh

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
PKT-0058 found both suites fail from test bugs, not product defects. Repair the test pages and remove their entries from `known` in `.theseus/oracle/sdkjs-common-run.cjs` when they go green (or record precisely what stays red):
- color-mods: 257 assertions fail by ±1 on one 0-255 channel (float vs Office fixed-point rounding). Compare with a ±1 tolerance on R, G, B and A (the file's `IS_APPROX_EQUALS` switch covers RGB only).
- chartEx-serialize: the page loads no `common/AllFonts.js`, so `new asc_docs_api` throws before `QUnit.start()` (hang). Define `g_fonts_selection_bin = ""` (or load a fonts stub), load only the scripts it needs (cell+slide+word together redeclare globals), and decide what to do with "Compare 1xml": `CChartSpace` has no `fromXml`/`toXml`, so the test needs a serializer that is not in this codebase — mark it `QUnit.test.skip` with that reason rather than implement it.

## Essential context
- Diagnosis and stacks: `.theseus/atlas/sdkjs-common.md` (color-mods and chartEx rows) and the comment above `known` in `sdkjs-common-run.cjs`.
- Reproduce one suite: `.theseus/oracle/sdkjs-common.sh color-mods` (or `charts`).

## Suggested plan

## Executor log
- attempt 1: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)
- attempt 2: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)

## Spawned packets

## Review

## Lessons for the Atlas
