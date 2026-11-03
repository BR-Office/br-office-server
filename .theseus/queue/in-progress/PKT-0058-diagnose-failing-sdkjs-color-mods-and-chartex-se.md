---
id: PKT-0058
title: Diagnose failing sdkjs color-mods and chartEx-serialize QUnit suites
type: investigate
priority: low
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0046

depends_on: []
requires: [browser]

target:
  files:
    - .theseus/atlas/sdkjs-common.md
    - .theseus/oracle/sdkjs-common-run.cjs
  create_in: []

context:
  cards: [sdkjs-common]
  references: []

contract:
  preserve:
    - "The four upstream common/api suites keep passing"
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
Find out why tests/common/color-mods/color-mods.html fails (9766/10023, 11 tests: lum/sat/hue/alpha mods) and why tests/common/charts/chartEx-serialize.html does not finish in 120s under headless Chromium. Neither suite is in upstream tests/runAll.js. Decide for each: test bug, real defect or environment issue. If a suite can be made green, it can come back into .theseus/oracle/sdkjs-common-run.cjs (remove its local skip).

## Essential context
- Found by PKT-0046. Reproduce with `ORACLE_ALL=1 .theseus/oracle/sdkjs-common.sh color-mods` (or `charts`).
- Requires the Chromium browser (environment.md).

## Suggested plan

## Executor log
- attempt 1: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)
- attempt 2: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)

## Spawned packets

## Review

## Lessons for the Atlas
