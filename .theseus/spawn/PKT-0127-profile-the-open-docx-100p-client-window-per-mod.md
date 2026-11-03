---
id: SPAWN
title: Profile the open-docx-100p client window per module (CPU profile of the journey)
type: measure
priority: medium
module: project

origin:
  type: packet
  ref: PKT-0127

depends_on: []

target:
  files:
    - "[FILE]"
  create_in: []

context:
  cards: [project]
  references: []

contract:
  preserve:
    - "[WHAT MUST NOT CHANGE]"
  forbidden: []

acceptance:
  commands:
    - "[ORACLE COMMAND]"

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
Add a CDP CPU profile (Profiler, 100 us) to `open-docx-100p-run.cjs` over Editor.bin→painted and replace the PKT-0043 share estimate in `.theseus/journeys/open-docx-100p.md` (client-open-* and layout-finish-paint stages, 2 379 ms of 4 628) by measured self-time per module. Also split editor-bin-download (646 ms) into network vs main-thread wait. Requires environments documentserver and browser.

## Essential context

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
