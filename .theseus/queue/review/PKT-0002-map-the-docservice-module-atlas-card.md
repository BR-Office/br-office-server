---
id: PKT-0002
title: Map the docservice module (Atlas card)
type: investigate
role: cartographer
priority: high
module: docservice
origin:
  type: plan
  ref: atlas:docservice
depends_on: []
target:
  files: []
  create_in:
  - .theseus/atlas
context:
  cards: []
  references:
  - DocService
  - .theseus/spec/module-card.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - test -s .theseus/atlas/docservice.md
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
Map the module `docservice` (`DocService`) into the Atlas card `.theseus/atlas/docservice.md`, following `.theseus/prompts/cartographer.md` and `.theseus/spec/module-card.md`, and add its row to `.theseus/atlas/INDEX.md`.

## Essential context
- Planned by `theseus plan`: the adapter lists this module and it has no card yet.
- Document coordination server (co-editing, conversion requests, WOPI).

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: cat .theseus/spec/module-card.md; ls .theseus .theseus/adapter; cat .theseus/atlas/graph.json 2>/dev/null | head -50; th…; Bash: cat .theseus/spec/module-card.md; ls .theseus .theseus/adapter; ls .theseus/atlas; theseus --help 2>&1 | head -40; wc -l…; Bash: cd DocService/sources && wc -l ai/*.js databaseConnectors/*.js routes/*.js 2>/dev/null; grep -nE "app\.(get|post|put|use…; Bash: sed -n '/^## Responsibility/,$p' .theseus/atlas/docservice.md | wc -w; test -s .theseus/atlas/docservice.md && echo OK

## Spawned packets

## Review

## Lessons for the Atlas
