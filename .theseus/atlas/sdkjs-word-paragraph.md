---
id: sdkjs-word-paragraph
title: sdkjs word paragraph — Paragraph model and line/page layout
kind: module
parent: sdkjs-word
paths: [external/sdkjs/word/Editor/Paragraph.js, external/sdkjs/word/Editor/Paragraph_Recalculate.js]
languages: null                   # tool
size: null                        # tool (by wc: Paragraph.js ~21k, Paragraph_Recalculate.js ~4.7k)

base_commit: 76633f92a84cd985ff17fc0b79c111188ce431cd
updated_at: 2026-11-02
updated_by: claude-opus-5-5
verified_by: null
freshness: current

dependencies: null                # tool
metrics: null                     # tool

oracle:
  level: partial
  sources: [external/sdkjs/tests/word (QUnit)]

verdict: null
---

## Responsibility
The `Paragraph` class: holds runs and inline content, paragraph properties, and lays itself out into lines and page fragments when `CDocument` asks [model]. It does NOT own run internals (`Run.js`, ~13k), text shaping (`Editor/Paragraph/TextShaper.js`) or the `Editor/Paragraph/` helpers (~27k together) — those need their own cards [model].

Split note: the index group (`Paragraph*.js`, `Run.js`, `ParagraphContent*.js`, `Editor/Paragraph/`) is ~79k lines by `wc`; this card covers only `Paragraph.js` + `Paragraph_Recalculate.js` (~26k, slightly over the limit, kept together because recalculation is one concern split across two files) [model].

## Entry points
- `Paragraph(Parent, bFromPresentation)` — `Paragraph.js:57` (also used by slide editor) [model].
- `Recalculate_Page(CurPage, isStart, isFast)` — `Paragraph_Recalculate.js:420`, called by `CDocument.Recalculate_PageColumn` and table cells [model].
- `Recalculate_FastWholeParagraph` (`:39`) — fast incremental relayout [model].
- `Draw(CurPage, pGraphics)` — `Paragraph.js:2215` [model].
- `Shift(CurPage, Dx, Dy)` — `Paragraph.js:3857`, moves an already laid-out page without relayout [model].

## Main flow
1. `Recalculate_Page` → `private_RecalculatePage` (`:661`) [model].
2. Per line, `private_RecalculateLine` (`:994`) measures run ranges, breaks, tabs, floating objects [model].
3. Result: page/line/range records, or a signal to continue on the next page/column [model].
4. `Draw` paints lines through the graphics object [model].

## Invariants
Nothing verified yet.

## Pitfalls
- Shared with the presentation editor (`bFromPresentation`) — changes affect slides too [model].
- The `Paragraph.prototype` is extended from several files; a method may live outside `Paragraph.js` [model].

## Hotspots
Nothing measured. Line recalculation is the likely inner loop of open and edit relayout [model].

## Available oracle
sdkjs QUnit suites under `external/sdkjs/tests/word/` (not run here) [model].

## Open questions
- Cards for `Run.js`, `ParagraphContent*.js` and `Editor/Paragraph/`.
- Per-line cost of shaping vs. measuring?

## Lessons
- [PKT-0034] Paragraph group is ~79k lines; split by file.
