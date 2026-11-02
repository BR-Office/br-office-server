---
id: sdkjs-word-model-core
title: sdkjs word model-core — CDocument root, actions and page recalculation loop
kind: module
parent: sdkjs-word
paths: [external/sdkjs/word/Editor/Document.js]
languages: null                   # tool — no graph.json yet
size: null                        # tool — no graph.json yet (Document.js is ~29k lines by wc)

base_commit: 76633f92a84cd985ff17fc0b79c111188ce431cd
updated_at: 2026-11-02
updated_by: claude-opus-5-5
verified_by: null
freshness: current

dependencies: null                # tool — .theseus/atlas/graph.json does not exist
metrics: null                     # tool — not computed yet

oracle:
  level: partial
  sources: [external/sdkjs/tests/word (QUnit, e.g. document-calculation)]

verdict: null
---

## Responsibility
`CDocument`, the root of the Word document model: it owns the top-level content array, sections, styles/numbering handles, selection, the action/undo bracket and the page-by-page recalculation loop [model]. It does NOT lay out lines (that is `Paragraph`/`Table`, see [sdkjs-word-paragraph](sdkjs-word-paragraph.md)) nor parse files (see [sdkjs-word-serialize](sdkjs-word-serialize.md)) [model].

Split note: the index card grouped `Document.js`, `DocumentContent*.js`, controllers, `History.js` and `SelectedContent.js` (~48k lines by `wc`). That is over the 20k limit, so this card covers `Document.js` only; the rest needs its own card [model].

## Entry points
- `CDocument(DrawingDocument, isMainLogicDocument)` — `Document.js:1162`, constructor [model].
- `On_EndLoad` (~1673) / `LoadEmptyDocument` (~1817) — finish opening; called after the reader fills the model [model].
- `StartAction` (~1997) / `FinalizeAction` (~2204) — bracket a user command; history point, deferred recalculation, selection and interface update [model].
- `Recalculate(isForce)` (~2072) — deferred while `Action.Start`, otherwise `private_Recalculate` (~2844) [model].
- `RecalculateByChanges` (~3235), `private_RecalculateFastRunRange` / `FastParagraph` (~3254/~3318) — incremental paths used after edits and remote changes [model].
- `Continue_FastCollaborativeEditing` (~15659) — co-edit loop hook [model].
- `UpdateInterface` (~2116), `Document_UpdateInterfaceState` (~12085) — pushes state to the UI [model].

## Main flow
1. Reader builds content, then `On_EndLoad` runs [model].
2. A command calls `StartAction`, mutates content via controllers, calls `FinalizeAction` [model].
3. `private_Recalculate` decides the start page/element from the change data (fast paths for a single run/paragraph) [model].
4. `Recalculate_Page` (~3435) → `Recalculate_PageColumn` (~3565) asks each element (`Paragraph`/`CTable`) to `Recalculate_Page` until the page fills [model].
5. `ContinueRecalculationLoopTimer` (~3185) runs `ContinueRecalculationLoop` via `setTimeout(...,10)`, so long documents are laid out in slices, not in one call [model].
6. Header/footer page-count recalculation runs on its own timer (`setTimeout(...,20)`, ~4954) [model].
7. Drawing is requested through `DrawingDocument` as pages complete [model].

## Invariants
- Recalculation inside an action is deferred until `FinalizeAction` (`Action.Recalculate = true`) [model].
- Only one recalculation loop is live: a loop whose `timerId` differs from `FullRecalc.Id` stops (~3209) [model].
- Mutations go through History change objects so undo and co-editing see them (sdkjs AGENTS.md) [model].

## Pitfalls
- Recalculation is asynchronous: "document opened" ≠ "all pages laid out". Timing open must say which one is measured [model].
- Fast paths can silently fall back to full recalculation; cost differs by orders of magnitude [model].
- Many comments are in Russian [model].

## Hotspots
Nothing measured. Likely: `Recalculate_Page`/`Recalculate_PageColumn` on open and after remote changes [model].

## Available oracle
`external/sdkjs/tests/word/` QUnit suites (`document-calculation`, `api`, `unit-tests`, …), runnable headless with `node tests/runAll.js` after `npm run develop` (sdkjs AGENTS.md) [model]. Not run in this packet.

## Open questions
- Share of open time in the first synchronous slice vs. the timer loop?
- How often do remote changes take the fast path vs. full recalculation?
- Card for `DocumentContent*.js` + controllers + `History.js` + `SelectedContent.js` (~19k).

## Lessons
- [PKT-0034] `Document.js` alone is ~29k lines; the proposed "model-core" group was ~48k and had to be cut to one file.
