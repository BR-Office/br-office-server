---
id: SPAWN
title: Record PKT-0051 x2t phase split in oracle/baseline.md
type: characterize
priority: medium
module: x2t

origin:
  type: packet
  ref: PKT-0051

depends_on: []

target:
  files:
    - .theseus/oracle/baseline.md
  create_in: []

context:
  cards: [x2t]
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
Copy the phase-split table and the sdk-all.bin/.cache finding from .theseus/diagnosis/PKT-0051-x2t-split.md into .theseus/oracle/baseline.md (x2t section), stating native package 9.3.7-1 and strace overhead. PKT-0051 could not: baseline.md was outside its target.
Record PKT-0051 x2t phase split in oracle/baseline.md.

## Essential context

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
