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
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Map the module `sdkjs-word` (`external/sdkjs/word`) into the Atlas card `.theseus/atlas/sdkjs-word.md`, following `.theseus/prompts/cartographer.md` and `.theseus/spec/module-card.md`, and add its row to `.theseus/atlas/INDEX.md`.

## Essential context
- Planned by `theseus plan`: the adapter lists this module and it has no card yet.
- The document editor's model and layout in the browser. After Editor.bin arrives, 1.5-2.4 s of parse, layout and first render on open; applying remote co-edit changes (p90 105-187 ms).

## Suggested plan

## Executor log
- Size check by `wc`: ~428k lines of JS (Editor/ ~190k; Document.js 29k, Paragraph.js 21k, Table.js 20k). Far over the 20k limit, so per spec §3 the card is an **index card** (responsibility, proposed submodules, how they relate), not a module card.
- Tool fields (languages, size, dependencies, metrics) left null: no graph.json. Sizes in the body are marked as `wc`, not tool data.
- Traced only the open path (api.js OpenDocumentFromBin → Serialize2 BinaryFileReader → CDocument.Recalculate) and co-edit apply (CWordCollaborativeEditing, Continue_FastCollaborativeEditing); line refs in the card.
- Spawned request `.theseus/spawn/PKT-0031-split-sdkjs-word-into-submodule-cards.md` for the submodule cards.
- Not done: oracle not investigated (sdkjs tests outside the module path); `find -exec`/loops were refused by permissions, so sizes come from shell globs.

## Spawned packets

## Review

## Lessons for the Atlas
