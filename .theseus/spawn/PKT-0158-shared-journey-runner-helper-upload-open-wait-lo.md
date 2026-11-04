---
id: SPAWN
title: Shared journey runner helper (upload, open, wait-loaded, per-request accounting)
type: chore
priority: medium
module: project

origin:
  type: packet
  ref: PKT-0158

depends_on: []

target:
  files:
    - .theseus/oracle/journeys/lib/runner.cjs
  create_in:
    - .theseus/oracle/journeys/lib

context:
  cards: [project]
  references: []

contract:
  preserve:
    - "Existing journey runners keep their output format and numbers"
  forbidden: []

acceptance:
  commands:
    - "node -e \"require('./.theseus/oracle/journeys/lib/runner.cjs')\""

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
Shared journey runner helper (upload, open, wait-loaded, per-request accounting).

## Essential context
AUD-7 O3: the journey runner (upload + open + wait-loaded, per-request download accounting, per-mark p50) was copied by PKT-0127, 0129, 0130, 0141; PKT-0135 got a wrong hand-computed p50. Create one helper module that prints per-mark p50; migrating the existing runners is a later packet.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
