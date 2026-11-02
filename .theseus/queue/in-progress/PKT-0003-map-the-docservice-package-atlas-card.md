---
id: PKT-0003
title: Map the DocService package (Atlas card)
type: investigate
priority: medium
module: docservice

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
    - DocService/sources/
    - tests/unit/
    - .theseus/spec/module-card.md

contract:
  preserve:
    - "No source code changes: this packet only writes the Atlas card"
  forbidden:
    - DocService/sources/**

acceptance:
  commands:
    - "test -f .theseus/atlas/docservice.md"
    - "theseus validate"

budget:
  max_files_changed: 2
  max_diff_lines: 300
  max_cost_usd: 3.00
  max_attempts: 2

roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Write the Atlas card `.theseus/atlas/docservice.md` for the `DocService` package (about 14,700 lines in `DocService/sources/`): the coordination server that handles editing sessions, conversions, storage and WOPI.

## Essential context
- `DocsCoServer.js` alone has 4,736 lines and no unit tests: it is the main hotspot. Describe its responsibilities and its main flows (connection, editing session, save, close) so it can later be split into submodules.
- Other large files: `canvasservice.js` (2,106), `wopiClient.js` (1,250), `converterservice.js` (773), `server.js` (496), `editorDataMemory.js` (506), database connectors under `databaseConnectors/`.
- At 14,700 lines the package is inside the 20,000-line limit, but propose submodules in "Open questions" if one card is not enough.
- No tool-generated metrics exist yet: never invent precise numbers.

## Suggested plan
1. Read `.theseus/spec/module-card.md`.
2. Start from `server.js` (the entry point) and follow what it wires together.
3. Write the card with every section, at most 800 words, claims tagged `[model]`.
4. In "Available oracle", be explicit that `DocsCoServer.js` has no unit tests.

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
