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
  reviewer: null
---

## Goal
Map the module `common` (`Common`) into the Atlas card `.theseus/atlas/common.md`, following `.theseus/prompts/cartographer.md` and `.theseus/spec/module-card.md`, and add its row to `.theseus/atlas/INDEX.md`.

## Essential context
- Planned by `theseus plan`: the adapter lists this module and it has no card yet.
- Shared library used by every service (utilities, configuration, storage, queues, tenants).

## Suggested plan

## Executor log
- [claude-opus-5-5] Wrote `.theseus/atlas/common.md` (base 59fa3ad) and added its INDEX row.
- Surprise: `.theseus/atlas/graph.json` does not exist, so every `# tool` field (languages, size, dependencies, metrics) is left `null`; I did not fill them from my own reading (rule A1). Index "Lines"/"Hotspot" are `n/a` for the same reason.
- Decision: one card for all of Common (sources ≈ 6.8k lines, under the 20k split threshold); `utils.js` flagged in Open questions as split candidate.
- Decision: INDEX.md says "generated, do not edit by hand", but the Goal asks for the row and no generator exists yet; added it by hand.
- Not done: friction line in `.theseus/scoreboard/friction.jsonl` — that path is outside `target.create_in`, so left to the factory/reviewer.

## Spawned packets

## Review

## Lessons for the Atlas
