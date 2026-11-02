---
id: PKT-0031
title: Map the sdkjs-word module (Atlas card)
type: investigate
role: cartographer
priority: high
module: sdkjs-word
origin:
  type: plan
  ref: atlas:sdkjs-word
depends_on: []
target:
  files:
  - .theseus/atlas/INDEX.md
  create_in:
  - .theseus/atlas
context:
  cards: []
  references:
  - external/sdkjs/word
  - .theseus/spec/module-card.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - test -s .theseus/atlas/sdkjs-word.md
budget:
  max_files_changed: 3
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: null
  reviewer: null
---

## Goal
Map the module `sdkjs-word` (`external/sdkjs/word`) into the Atlas card `.theseus/atlas/sdkjs-word.md`, following `.theseus/prompts/cartographer.md` and `.theseus/spec/module-card.md`, and add its row to `.theseus/atlas/INDEX.md`.

## Essential context
- Planned by `theseus plan`: the adapter lists this module and it has no card yet.
- The document editor's model and layout in the browser. After Editor.bin arrives, 1.5-2.4 s of parse, layout and first render on open; applying remote co-edit changes (p90 105-187 ms).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
