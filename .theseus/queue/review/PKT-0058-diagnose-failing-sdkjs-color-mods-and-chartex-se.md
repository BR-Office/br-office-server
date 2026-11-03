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
resume: false
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
- attempt 3: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)
- Reproduced both with the oracle filter and a scratch Playwright script hooking `QUnit.log` (actual/expected per failed assertion, page errors with stacks). Note: `ORACLE_ALL=1` in the Goal is not read by the oracle; the filter argument alone runs the suite.
- **color-mods → test expectations vs precision (not a defect, not environment).** All 257 failing assertions differ by exactly ±1 on one 0-255 channel (R/G/B mostly, 3 on A). sdkjs computes in floating point; the expected values follow Office's fixed-point truncation (alphaMod 25000 on A=128: sdkjs 32, expected 31). The file carries an unused `IS_APPROX_EQUALS` switch (RGB only). Cannot be made green without editing the test (outside target) → kept in `known`, unchanged.
- **chartEx-serialize → deterministic hang from a test bug (not slowness, not environment).** The page loads no `common/AllFonts.js`; `new asc_docs_api` throws in `CFontSelectList.Init` (`g_fonts_selection_bin` undefined passes the `!= ""` guard) inside the jQuery ready handler, so `setTimeout(startTests)` never runs and QUnit (autostart=false) never starts. Experiment with `g_fonts_selection_bin=''` injected: finishes in ~3 s, fails 13/13 — 12 "Script error" from cell+slide+word scripts redeclaring globals in one page, and "Compare 1xml" crashes because `CChartSpace` has no `fromXml`/`toXml` (base `CBaseNoIdObject.toXml` writes an undefined node name). The test was adapted from a vsdx test and targets a chartEx XML serializer absent from this codebase.
- Decision: neither suite can go green inside the target (needs test-file edits under external/sdkjs/tests), so both stay in `known`. Since the hang is at load, the chartEx wait drops from 120 s to 20 s (`ms` in `known`): oracle 6/6, 10066/10323, ~29 s instead of ~130 s.
- Spawned a low-priority request to repair the two test pages (`.theseus/spawn/`). No sdkjs file changed.
- Attempt after R2 rejection (DrawingDocument.js): external/sdkjs on pkt/PKT-0058 has no commits or working changes (HEAD = theseus = fork/pkt/PKT-0058 = 3d51031) and stays clean after running the oracle, so this packet never touched that file. The same rejection blocked PKT-0085, which suggests the change came from another packet's leftover state in the shared checkout, not from here. Re-ran acceptance: 6/6, 10066/10323, 29 s. No further code change.
- Attempt 3 (second R2 rejection): pkt/PKT-0058 = theseus = fork branch = 3d51031, clean tree. `git log origin/main..theseus -- word/Drawing/DrawingDocument.js` shows 3d51031 "Merge pkt/PKT-0078": the 27-line DrawingDocument.js difference is between origin/main and the `theseus` base branch (PKT-0078's merge), so a scope check diffing against origin/main instead of `theseus` attributes it to this packet. Not fixable from here without touching that file (forbidden); the factory's R2 base for external/sdkjs should be `theseus`. Acceptance re-run: 6/6, 10066/10323, 29 s.
- block: 3 attempts failed; last: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)
- release: blocked by a Theseus bug (the fork checkout counted changes already merged into the collecting branch as this packet's); fixed in 0.20.0

## Spawned packets
- PKT-0090: Repair sdkjs color-mods and chartEx-serialize test pages so they join the common oracle

## Review

## Lessons for the Atlas
