---
id: PKT-0122
title: Map the web-apps-pdfeditor module (Atlas card)
type: investigate
role: cartographer
priority: high
module: web-apps-pdfeditor
origin:
  type: plan
  ref: atlas:web-apps-pdfeditor
depends_on: []
target:
  files:
  - .theseus/atlas/INDEX.md
  create_in:
  - .theseus/atlas
context:
  cards: []
  references:
  - external/web-apps/apps/pdfeditor
  - .theseus/spec/module-card.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - test -s .theseus/atlas/web-apps-pdfeditor.md
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
Map the module `web-apps-pdfeditor` (`external/web-apps/apps/pdfeditor`) into the Atlas card `.theseus/atlas/web-apps-pdfeditor.md`, following `.theseus/prompts/cartographer.md` and `.theseus/spec/module-card.md`, and add its row to `.theseus/atlas/INDEX.md`.

## Essential context
- Planned by `theseus plan`: the adapter lists this module and it has no card yet.
- The PDF editor application shell.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
