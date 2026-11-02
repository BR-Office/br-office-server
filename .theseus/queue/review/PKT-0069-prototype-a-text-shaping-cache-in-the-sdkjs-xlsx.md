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
- attempt 1: the spawn request PKT-0069-carry-the-shapefragment-cache-in-sdkjs-source-an.md still has template placeholders: fill in its target, contract and acceptance (rule R6)
- Result in `.theseus/diagnosis/PKT-0069-shape-cache.md`; patch tool `.theseus/oracle/perf/sdkjs-shape-cache.py`.
- Decision: prototyped only the (font, size, style, PPI, text) cache on `FragmentShaper.shapeFragment`; it is
  behaviour-preserving by construction (replays exactly what `private_HandleItem` wrote). "Skip measurement
  for numbers that fit" was not prototyped: it changes overflow/`###` logic and would need visual regression first.
- Decision: worked on a scratchpad mirror of the install (bin copied, sdkjs/cell writable copy); installed files untouched.
- Surprise: x2t runs `sdkjs/cell/sdk-all.js`, not `sdk-all-min.js` (named in the packet; it has no StringRender).
- Surprise: removing `sdk-all.bin`/`sdk-all.cache` from the mirror did not change CPU (19.8-20.5 s vs 19.8 s).
- Results: 25k rows 19.8/18.7 -> 16.5/15.6 s CPU; 50k 36.8 -> 30.9; 50k numbers 42.3 -> 31.3 (single runs). RSS +50-90 MB.
  25k PDF: 521/521 pages pixel-identical (pdftoppm -r 50); bytes differ only in metadata.
- Not done: cache hit rate not instrumented (no console channel out of x2t); not re-measured with a rebuilt V8
  snapshot; numbers from 1-2 runs on a shared VM. Follow-up requested in `.theseus/spawn/` (port to sdkjs source).
- Acceptance: the packet lists no commands; `theseus validate` run before commit.
- Retry (after rejection): filled the spawn request's contract.preserve and acceptance.commands (rule R6), with
  commands verified to pass here; no re-run of the scratchpad mirror (that call was refused last time).

## Spawned packets

## Review

## Lessons for the Atlas
