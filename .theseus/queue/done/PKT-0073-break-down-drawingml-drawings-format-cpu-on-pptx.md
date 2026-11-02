---
id: PKT-0073
title: Break down DrawingML (Drawings/Format) CPU on pptx open
type: investigate
priority: medium
module: sdkjs-common
origin:
  type: plan
  ref: plan:sdkjs-common:dcb03039:W1b
depends_on:
- PKT-0045
target:
  files:
  - .theseus/oracle/baseline.md
  create_in:
  - .theseus/oracle/perf
context:
  cards:
  - sdkjs-common
  references:
  - .theseus/diagnosis/DIAG-sdkjs-common.md
contract:
  preserve:
  - Existing tests keep passing; their assertions change only where the goal requires it, and the log says why
  forbidden: []
allowed_commands:
- '*'
acceptance:
  commands: []
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
---

## Goal
With profile-client.js on pptx 50 (and docx/xlsx for comparison), attribute the ~300 ms drawings self time of pptx open to functions in common/Drawings/Format and name refactor candidates with an expected gain, or state that none exceeds 50 ms. Coordinate with the sdkjs-slide diagnosis.

## Essential context
- Wave 1 of the plan in `.theseus/diagnosis/DIAG-sdkjs-common.md` (row `W1b`).
PKT-0045 put drawings at 296 ms (35 % of common) on pptx open and 55-88 ms on docx/xlsx.

## Suggested plan

## Executor log
- Wrote `.theseus/oracle/perf/drawings-functions.js` instead of editing `profile-client.js` (not in target.files): it loads
  profile-client's helpers (source before `main()`) and adds per-function self/inclusive and caller attribution for the
  drawings group. Ran 3 cold opens of the PKT-0045 samples (deck-50.pptx, medium-10p/large-100p.docx, large-10k.xlsx) on the
  native Document Server; raw output `perf/drawings-functions-2026-11-02.json`; results in baseline.md, new section.
- Result: drawings self 282-290 ms on pptx (reproduces PKT-0045). Flat profile: no function above 31 ms self. One candidate
  above 50 ms inclusive: `CShape.recalculateTextStyles`/`Get_Styles` 143 ms incl., 91 ms of it `CMemory.sha256` from
  word style-cache. Spawned a refactor request for it (targets under external/sdkjs: needs the fork).
- Surprise: ~30 ms of "drawings" is font loading in `common/Drawings/Externals.js` (xhr.onload, LoadFontArrayBuffer);
  in docx/xlsx it is most of the group. PKT-0045's grouping should move Externals.js to fonts.
- Surprise: file attribution by nearest anchor is off for some methods (getIsSingleBody under CnxShape.js); function
  names are exact, so the table is by function. Anonymous closures were resolved by reading the bundle at the offset.
- Not done: the summary keeps only the top 40 functions per field (the tail is not itemized); no change to sdkjs
  (read-only); sdkjs-slide diagnosis coordination is limited to naming the slide callers in baseline and the spawn.
- Acceptance: the packet lists no commands.

## Spawned packets
- PKT-0078: Cache shape text styles (CShape.recalculateTextStyles + style-cache sha256) on pptx open

## Review
- Approved by claude-opus-5-5-b: Per-function breakdown matches raw data, answers the goal (no function over 50 ms self; style-building candidate requested as a refactor)

## Lessons for the Atlas
