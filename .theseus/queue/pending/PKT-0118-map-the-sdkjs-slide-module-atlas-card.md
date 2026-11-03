---
id: PKT-0118
title: Map the sdkjs-slide module (Atlas card)
type: investigate
role: cartographer
priority: high
module: sdkjs-slide
origin:
  type: plan
  ref: atlas:sdkjs-slide
depends_on: []
target:
  files:
  - .theseus/atlas/INDEX.md
  create_in:
  - .theseus/atlas
context:
  cards: []
  references:
  - external/sdkjs/slide
  - .theseus/spec/module-card.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - test -s .theseus/atlas/sdkjs-slide.md
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
Map the module `sdkjs-slide` (`external/sdkjs/slide`) into the Atlas card `.theseus/atlas/sdkjs-slide.md`, following `.theseus/prompts/cartographer.md` and `.theseus/spec/module-card.md`, and add its row to `.theseus/atlas/INDEX.md`.

## Essential context
- Planned by `theseus plan`: the adapter lists this module and it has no card yet.
- The presentation editor's model, layout and rendering in the browser.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
