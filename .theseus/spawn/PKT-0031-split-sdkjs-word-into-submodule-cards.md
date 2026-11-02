---
id: SPAWN
title: Split sdkjs-word into submodule cards
type: investigate
priority: medium
module: sdkjs-word

origin:
  type: packet
  ref: PKT-0031

depends_on: []

target:
  files:
    - .theseus/atlas/INDEX.md
    - .theseus/atlas/sdkjs-word.md
  create_in:
    - .theseus/atlas

context:
  cards: [sdkjs-word]
  references: [external/sdkjs/word, .theseus/spec/module-card.md]

contract:
  preserve:
    - No source code changes
  forbidden: []

acceptance:
  commands:
    - test -s .theseus/atlas/sdkjs-word-model-core.md

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
---

## Goal
Write the first submodule cards of `sdkjs-word` (start with word/model-core, word/paragraph and word/serialize, which carry document open and recalculation), following the split proposed in the index card `.theseus/atlas/sdkjs-word.md`; adjust the split if the code disagrees, and link the new cards from the index card and INDEX.md. The remaining submodules need further packets.

## Essential context
- PKT-0031 found `external/sdkjs/word` is ~428k lines of JS (by `wc`), far over the 20k limit, so it wrote an index card only.
- No graph.json exists: tool fields stay null.
- Open path: `api.js` OpenDocumentFromBin -> `Serialize2.js` BinaryFileReader -> `Document.js` CDocument.Recalculate. `Document.js` (29k) and `Paragraph.js` (21k) are single files near/over the limit; a card may cover one file.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
