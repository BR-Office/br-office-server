---
id: PKT-0084
title: "sdkjs fork: land hb_get_script_horizontal_direction table (PKT-0080 patch), unit test and in-browser measurement"
type: refactor
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0080

depends_on: [PKT-0080]
requires: [documentserver, browser]

target:
  files:
    - external/sdkjs/common/libfont/common.js
    - external/sdkjs/tests/common/libfont/script-direction.js
    - external/sdkjs/tests/common/libfont/script-direction.html
  create_in: []

context:
  cards: [sdkjs-common]
  references:
    - .theseus/queue/done/PKT-0080-libfont-table-lookup-for-hb-get-script-horizonta.md
    - .theseus/oracle/baseline.md

contract:
  preserve:
    - Same direction result for every HB_SCRIPT value (table equals the switch); existing tests keep passing
  forbidden: []

acceptance:
  commands:
    - bash .theseus/oracle/sdkjs-common.sh

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
sdkjs fork: land hb_get_script_horizontal_direction table (PKT-0080 patch), unit test and in-browser measurement.

## Essential context
- PKT-0080 wrote the change in the read-only clone `external/sdkjs` (not committed anywhere); its patch is in the
  PKT-0080 Executor log. It needs an sdkjs fork / a way to carry sdkjs patches before it can land.
- Add a QUnit test comparing `AscFonts.hb_get_script_horizontal_direction` with
  `AscFonts.hb_get_script_horizontal_direction_switch` for every `AscFonts.HB_SCRIPT` value (PKT-0080 could not:
  `create_in` was empty).
- Measure in the browser: build the patched sdkjs, serve it from a mirror of the install, rerun
  `profile-fonts.js` (PKT-0072, only on branch pkt/PKT-0072, not on main when PKT-0080 ran) on large-100p.docx.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
