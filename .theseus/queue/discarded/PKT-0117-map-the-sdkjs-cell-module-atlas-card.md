---
id: PKT-0117
title: Map the sdkjs-cell module (Atlas card)
type: investigate
role: cartographer
priority: high
module: sdkjs-cell
origin:
  type: plan
  ref: atlas:sdkjs-cell
depends_on: []
target:
  files:
  - .theseus/atlas/INDEX.md
  create_in:
  - .theseus/atlas
context:
  cards: []
  references:
  - external/sdkjs/cell
  - .theseus/spec/module-card.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - test -s .theseus/atlas/sdkjs-cell.md
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
Map the module `sdkjs-cell` (`external/sdkjs/cell`) into the Atlas card `.theseus/atlas/sdkjs-cell.md`, following `.theseus/prompts/cartographer.md` and `.theseus/spec/module-card.md`, and add its row to `.theseus/atlas/INDEX.md`.

## Essential context
- Planned by `theseus plan`: the adapter lists this module and it has no card yet.
- The spreadsheet editor's model, layout and rendering in the browser (and in x2t's xlsx to pdf). Per-cell text shaping is 79% of a large xlsx to pdf; remote changes re-shape cells, about 200-250 ms per 20 changes.

## Suggested plan

## Executor log
- discard: Rafael, 2026-11-03: finish one application (the document editor) before spreadsheets, presentations and PDF

## Spawned packets

## Review

## Lessons for the Atlas
