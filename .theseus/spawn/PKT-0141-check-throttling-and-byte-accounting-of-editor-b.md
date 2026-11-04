---
id: SPAWN
title: Check throttling and byte accounting of Editor.bin and media in open-docx-real-internet
type: measure
priority: medium
module: project

origin:
  type: packet
  ref: PKT-0141

depends_on: []
requires: [documentserver, browser]

target:
  files:
    - .theseus/oracle/journeys/open-docx-real-internet-run.cjs
    - .theseus/journeys/open-docx-real-internet.md
  create_in: []

context:
  cards: [project]
  references: []

contract:
  preserve:
    - "No change to the code of the project or of its forks"
  forbidden: []

acceptance:
  commands:
    - "bash .theseus/oracle/journeys/open-docx-real-internet.sh"

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
In PKT-0141 the CDP accounting reported 0 encoded bytes for Editor.bin and the 7 media under `/cache/files/`, and Editor.bin took 15 ms (p50) under 50 Mbps emulation. Find out how these are fetched (worker, memory cache, XHR from another target) and make sure they are throttled and counted (e.g. `Network.dataReceived`, `responseReceived.encodedDataLength`, or `Target.setAutoAttach` for workers), then re-measure and update the editor-bin-download stage of the map.

## Essential context
- `.theseus/journeys/open-docx-real-internet.md` (caveat and downloads table).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
