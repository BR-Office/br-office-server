---
id: PKT-0139
title: Profile the open-docx-real client window (Editor.bin to last paint) with a CPU profile
type: measure
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0135

depends_on: []
requires: [documentserver, browser]

target:
  files: []
  create_in:
    - .theseus/journeys
    - .theseus/oracle

context:
  cards: [sdkjs-common]
  references: []

contract:
  preserve:
    - "No change to the code of the project or of its forks"
  forbidden: []

acceptance:
  commands:
    - "grep -q 'client_profile:' .theseus/journeys/open-docx-real.md"
    - "theseus validate"

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
Profile the open-docx-real client window (Editor.bin to last paint) with a CPU profile.

## Essential context
- PKT-0135 split the client window of open-docx-real (Editor.bin received -> last paint, 1 283 + 471 ms p50) by the
  PKT-0043 CPU shares of a text-only sample: an estimate. This sample has images, tables and CJK fonts, so the
  sdkjs-common (fonts, images) share is likely understated.
- Record a CDP CPU profile of that window with `.theseus/oracle/journeys/open-docx-real-run.cjs` against
  `serve-integrated.sh up`, attribute self time per module, and replace the estimated stages in the map.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
