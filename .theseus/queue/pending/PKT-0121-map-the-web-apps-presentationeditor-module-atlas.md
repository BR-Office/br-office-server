---
id: PKT-0121
title: Map the web-apps-presentationeditor module (Atlas card)
type: investigate
role: cartographer
priority: high
module: web-apps-presentationeditor
origin:
  type: plan
  ref: atlas:web-apps-presentationeditor
depends_on: []
target:
  files:
  - .theseus/atlas/INDEX.md
  create_in:
  - .theseus/atlas
context:
  cards: []
  references:
  - external/web-apps/apps/presentationeditor
  - .theseus/spec/module-card.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - test -s .theseus/atlas/web-apps-presentationeditor.md
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
Map the module `web-apps-presentationeditor` (`external/web-apps/apps/presentationeditor`) into the Atlas card `.theseus/atlas/web-apps-presentationeditor.md`, following `.theseus/prompts/cartographer.md` and `.theseus/spec/module-card.md`, and add its row to `.theseus/atlas/INDEX.md`.

## Essential context
- Planned by `theseus plan`: the adapter lists this module and it has no card yet.
- The presentation editor application shell: what loads before the presentation.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
