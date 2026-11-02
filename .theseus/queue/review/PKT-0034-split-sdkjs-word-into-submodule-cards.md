---
id: PKT-0034
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
  executor: claude-opus-5-5
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
- attempt 1: the executor's permissions refused: Bash: cd /home/claude/euro-office-server.theseus-worktrees/PKT-0034/external/sdkjs/word/Editor; sed -n 2844,2870p Document.js;…; Bash: cd /home/claude/euro-office-server.theseus-worktrees/PKT-0034/external/sdkjs/word/Editor; grep -n "setTimeout" Document.…; Bash: cd /home/claude/euro-office-server.theseus-worktrees/PKT-0034; sed -n 7954,7975p external/sdkjs/word/Editor/Serialize2.j…; Bash: cd /home/claude/euro-office-server.theseus-worktrees/PKT-0034 && python3 - <<'EOF'; Bash: cd /home/claude/euro-office-server.theseus-worktrees/PKT-0034 && python3 /tmp/claude-0/-home-claude-euro-office-server-t…; Bash: python3 /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0034/0204548c-a824-57b7-bea3-1783011bc81a/sc…; Bash: sed -i 's#^id: sdkjs-word/model-core#id: sdkjs-word-model-core#' .theseus/atlas/sdkjs-word-model-core.md && sed -i 's#^i…
- Decision: the model-core group in the index card is ~48k lines (`wc`). Card `sdkjs-word-model-core.md` covers only `Document.js` (~29k), which the packet allows. The rest is listed as new submodule `word/content` in the index card.
- Decision: the paragraph group is ~79k lines. Card `sdkjs-word-paragraph.md` covers `Paragraph.js` + `Paragraph_Recalculate.js` (~26k), kept together because they are one concern. The rest is listed as `word/run`.
- `Serialize2.js` (~17.8k) fits in one card.
- Decision: card ids are flat (`sdkjs-word-model-core`, not `sdkjs-word/model-core`). `theseus validate` requires the path to match the id, and the acceptance command fixes a flat file name. `parent: sdkjs-word` records the hierarchy.
- Surprise: recalculation runs in timer slices (`ContinueRecalculationLoopTimer`, setTimeout 10 ms). So "document open" and "all pages laid out" are different end points, which matters for timing.
- Surprise: sdkjs ships QUnit suites in `external/sdkjs/tests/word/`, so oracle is set to partial. They were not run (no build).
- Not done: the remaining submodule cards. No follow-up request was filed, because the index card already lists those submodules as needing packets. All claims are [model]. Line anchors were checked with grep at the base commit.

## Spawned packets

## Review

## Lessons for the Atlas
