---
id: PKT-0062
title: Give PKT-0055 a runnable acceptance instead of [ORACLE COMMAND]
type: characterize
priority: medium
module: x2t

origin:
  type: packet
  ref: PKT-0055

depends_on: []

target:
  files:
    - "[FILE]"
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
    - "grep -q 'x2t phase split (PKT-0041' .theseus/oracle/baseline.md"

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
PKT-0055's acceptance is the literal placeholder `[ORACLE COMMAND]` (exit 127), so it can never pass although the work is done (commit bf7e8e5). Replace it with a runnable check such as `grep -q 'x2t phase split (PKT-0041' .theseus/oracle/baseline.md`, and stop `theseus packet new` from emitting unrunnable placeholders for docs-only packets.
Give PKT-0055 a runnable acceptance instead of [ORACLE COMMAND].

## Essential context

## Suggested plan

## Executor log
- discard: unfinished spawn request (template placeholders) queued before Theseus 0.16.2

## Spawned packets

## Review

## Lessons for the Atlas
