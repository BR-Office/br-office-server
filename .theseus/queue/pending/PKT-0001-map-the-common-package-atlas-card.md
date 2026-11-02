---
id: PKT-0001
title: Map the Common package (Atlas card)
type: investigate
priority: high
module: common

origin:
  type: human
  ref: null

depends_on: []

target:
  files: []
  create_in: [.theseus/atlas/]

context:
  cards: []
  references:
    - Common/sources/
    - tests/unit/
    - .theseus/spec/module-card.md

contract:
  preserve:
    - "No source code changes: this packet only writes the Atlas card"
  forbidden:
    - Common/sources/**

acceptance:
  commands:
    - "test -f .theseus/atlas/common.md"
    - "theseus validate"

budget:
  max_files_changed: 2
  max_diff_lines: 300
  max_cost_usd: 3.00
  max_attempts: 2

roles:
  executor: null
  reviewer: null
---

## Goal
Write the Atlas card `.theseus/atlas/common.md` for the `Common` package (about 7,500 lines in `Common/sources/`), so later packets can work on it without reading the whole package.

## Essential context
- `Common` is shared by `DocService`, `FileConverter` and the other services: utilities, configuration, logging, task queues (RabbitMQ / ActiveMQ), storage, constants (`commondefines.js`), format detection (`formatchecker.js`).
- Largest files: `utils.js` (1,563 lines), `commondefines.js` (1,245), `formatchecker.js` (793), `taskqueueRabbitMQ.js` (645).
- Unit tests touching Common: `tests/unit/utils.tests.js`, `request.tests.js`, `requestSSRF.tests.js`, `runtimeConfigManager.tests.js`, `sentryReporter.tests.js`, `mailService.tests.js`.
- No tool-generated metrics exist yet: leave the `# tool` fields (`size`, `metrics`, `dependencies`) empty or estimated and say so with `[model]`; never invent precise numbers.

## Suggested plan
1. Read `.theseus/spec/module-card.md`.
2. Skim `Common/sources/` file by file; read the entry points other packages `require`.
3. Write the card with every section of the specification, at most 800 words, claims tagged `[model]`.
4. In "Available oracle", list which functions of `utils.js` the unit tests cover and which they do not: PKT-0002 depends on this list.
5. Set `oracle.level`, `freshness: current` and `base_commit` (current commit).

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
