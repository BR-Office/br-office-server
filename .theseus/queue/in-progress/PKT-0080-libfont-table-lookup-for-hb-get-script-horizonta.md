---
id: PKT-0080
title: "libfont: table lookup for hb_get_script_horizontal_direction / isRtlScript"
type: refactor
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0072

depends_on: [PKT-0072]
requires: [documentserver, browser]

target:
  files:
    - external/sdkjs/common/libfont/common.js
  create_in: []

context:
  cards: [sdkjs-common]
  references:
    - .theseus/oracle/baseline.md

contract:
  preserve:
    - Same direction result for every HB_SCRIPT value (table equals the switch); existing tests keep passing
  forbidden: []

acceptance:
  commands:
    - node .theseus/oracle/perf/profile-fonts.js <samples-dir> external/sdkjs 3  # hb_get_script_horizontal_direction self on large-100p.docx open

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
Replace the per-character switch with a precomputed table: libfont: table lookup for hb_get_script_horizontal_direction / isRtlScript.

## Essential context
- `AscFonts.hb_get_script_horizontal_direction` (common/libfont/common.js:291) is a `switch` over ~40
  `case BASE.HB_SCRIPT_X:` property loads; V8 cannot build a jump table, Latin text falls through every case. Called per
  character via `isRtlScript` from `CRunText.updateRtlFlag` (word) and `CTextShaper.GetDirection`.
- PKT-0072: 43 ms self on large-100p.docx open (408 k calls), 8–19 ms on the other samples and xlsx apply. Replace by a
  table indexed by script id built once (or a Set of RTL scripts). Expected gain ~40 ms on 100 p, growing with text.
- `external/` is read-only: the change needs the sdkjs fork. Add a unit test comparing table vs switch for all scripts.

## Suggested plan

## Executor log
- attempt 1: acceptance failed: `node .theseus/oracle/perf/profile-fonts.js <samples-dir> external/sdkjs 3`

## Spawned packets

## Review

## Lessons for the Atlas
