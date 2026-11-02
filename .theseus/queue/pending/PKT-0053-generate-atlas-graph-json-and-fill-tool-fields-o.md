---
id: PKT-0053
title: Generate atlas/graph.json and fill tool fields of module cards
type: investigate
priority: medium
module: atlas

origin:
  type: packet
  ref: PKT-0052

depends_on: []

target:
  files:
    - "[FILE]"
  create_in: []

context:
  cards: [atlas]
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
Generate `.theseus/atlas/graph.json` (module dependency graph and size metrics) and fill the tool fields of the module cards that are null today.

## Essential context
- Found by audit AUD-2 (O4): friction of PKT-0030, 0031, 0032, 0033 says every tool field of the cards is null because graph.json is missing; diagnosticians (PKT-0036 to 0039) ask for size and graph metrics.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
