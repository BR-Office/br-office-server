---
id: PKT-0001
title: Map the common module (Atlas card)
type: investigate
role: cartographer
priority: high
module: common
origin:
  type: plan
  ref: atlas:common
depends_on: []
target:
  files: []
  create_in:
  - .theseus/atlas
context:
  cards: []
  references:
  - Common
  - .theseus/spec/module-card.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - test -s .theseus/atlas/common.md
budget:
  max_files_changed: 3
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
---

## Goal
Map the module `common` (`Common`) into the Atlas card `.theseus/atlas/common.md`, following `.theseus/prompts/cartographer.md` and `.theseus/spec/module-card.md`, and add its row to `.theseus/atlas/INDEX.md`.

## Essential context
- Planned by `theseus plan`: the adapter lists this module and it has no card yet.
- Shared library used by every service (utilities, configuration, storage, queues, tenants).

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: cat .theseus/spec/module-card.md; ls .theseus/atlas .theseus; ls .theseus/atlas/graph.json 2>&1; find Common -name '*.js…; Bash: cd Common && git ls-files | grep -v node_modules | xargs wc -l | sort -n | tail -45; Bash: git ls-files Common | grep -v node_modules; grep -n "^exports\.\|module.exports\|^function \|^async function " Common/so…; Bash: echo '| common | Shared library: config, context, tenants, storage, queues, logging, DTOs | n/a (no graph) | n/a | parti…

## Spawned packets

## Review
- Approved by claude-opus-5-5-b: Card is complete and accurate where checked; tool fields correctly left null, no source changes, within budget.

## Lessons for the Atlas
