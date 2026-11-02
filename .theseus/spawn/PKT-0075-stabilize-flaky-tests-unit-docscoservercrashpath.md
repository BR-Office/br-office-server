---
id: SPAWN
title: Stabilize flaky tests/unit/docsCoServerCrashPaths.tests.js
type: investigate
priority: medium
module: docservice

origin:
  type: packet
  ref: PKT-0075

depends_on: []

target:
  files:
    - "[FILE]"
  create_in: []

context:
  cards: [docservice]
  references: []

contract:
  preserve:
    - "[WHAT MUST NOT CHANGE]"
  forbidden: []

acceptance:
  commands: []

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
Find and fix the cause of the intermittent failure of tests/unit/docsCoServerCrashPaths.tests.js so that `.theseus/oracle/unit.sh` is deterministic.
Stabilize flaky tests/unit/docsCoServerCrashPaths.tests.js.

## Essential context
- Seen by PKT-0075 (no JS changes): 3 runs of `.theseus/oracle/unit.sh` gave rc 0,1,0; 1 failed test in that suite only. Likely timing/handle-dependent (Jest also reports open handles).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
