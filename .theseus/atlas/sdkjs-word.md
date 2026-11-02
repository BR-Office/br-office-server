---
id: sdkjs-word
title: sdkjs word — document editor model, layout and API in the browser
kind: index
parent: null
paths: [external/sdkjs/word/]
languages: null                   # tool — no graph.json yet
size: null                        # tool — no graph.json yet (see Open questions)

base_commit: 76633f92a84cd985ff17fc0b79c111188ce431cd
updated_at: 2026-11-02
updated_by: claude-opus-5-5
verified_by: null
freshness: current

dependencies: null                # tool — .theseus/atlas/graph.json does not exist
metrics: null                     # tool — not computed yet

oracle:
  level: none
  sources: []

verdict: null
---

## Responsibility
The document (Word/DOCX) editor that runs in the browser: the public editor API, the in-memory document model (paragraphs, runs, tables, sections, styles, numbering, fields, comments, revisions), its layout/recalculation into pages, drawing on canvas, the binary (Editor.bin) reader/writer and the word-specific side of co-editing [model]. It depends on `external/sdkjs/common` and `external/sdkjs/cell`/`slide` shared drawing code, which have no cards [model].

This is an **index card**: the module is far above the 20,000-line limit (about 428k lines of `.js` by `wc`, not a tool figure), so it must be split before any module-level card is written (spec §3).

## Proposed submodules
| Submodule | Paths | Role |
|---|---|---|
| word/api | `api.js`, `apiBuilder.js`, `apiCommon.js`, `apiDefines.js`, `api_plugins.js`, `plugin-events.js`, `fromToJSON.js`, `Local/`, `document/`, `Editor/api/` | Public `asc_docs_api` (open, save, commands), DocBuilder/plugin API [model] |
| [word/model-core](sdkjs-word-model-core.md) | `Editor/Document.js` | `CDocument` root, actions, recalculation loop [model] |
| word/content | `DocumentContent*.js`, `DocumentController*`, `LogicDocumentController.js`, `History.js`, `SelectedContent.js` | Content containers, controllers, undo (~19k; split from model-core by PKT-0034) [model] |
| [word/paragraph](sdkjs-word-paragraph.md) | `Editor/Paragraph.js`, `Paragraph_Recalculate.js` | Paragraph model and line layout [model] |
| word/run | `Run.js`, `ParagraphContent*.js`, `ParagraphChanges.js`, `Editor/Paragraph/` | Runs, inline content, shaping, bidi (~53k; needs further split) [model] |
| word/table | `Editor/Table.js`, `Editor/Table/` | Tables model and layout [model] |
| word/layout | `Editor/Layout/`, `sections/`, `HeaderFooter*.js`, `Footnotes.js`, `Endnotes.js`, `FlowObjects.js` | Page/section recalculation, headers, notes [model] |
| word/styles-numbering | `Styles.js`, `Editor/Styles/`, `Editor/Numbering/` | Styles and lists [model] |
| word/features | comments, revisions, `Comparison.js`, `Merge.js`, fields, SDTs/forms, bookmarks, search, spellcheck, custom-xml, protection, `GraphicObjects/` | Editing features over the model [model] |
| [word/serialize](sdkjs-word-serialize.md) | `Editor/Serialize2.js` | Editor.bin `BinaryFileReader`/`BinaryFileWriter` [model] |
| word/collab | `CollaborativeEditing.js`, `*Changes.js` | Change classes and send/apply of co-edit changes [model] |
| word/drawing | `Drawing/` | `CDrawingDocument`, canvas `Graphics`, rulers, page cache, touch [model] |
| word/math | `Math/`, `Editor/Math*.js` | Equations (OMML, LaTeX, Unicode parsers) [model] |

## How they relate
Open: `asc_docs_api.OpenDocumentFromBin` (`api.js` ~1478) → `BinaryFileReader` (`Serialize2.js` ~7884) builds the `CDocument` (`Document.js` ~1162) → `CDocument.Recalculate` (~2072) / `Recalculate_Page` (~3435) lays out paragraphs and tables page by page → `Drawing/` renders pages [model]. Remote changes: `CWordCollaborativeEditing` (`CollaborativeEditing.js`) applies `*Changes` objects to the model, then a recalculation runs (`CDocument.Continue_FastCollaborativeEditing` ~15659) [model]. These are the two paths named in the packet's timings (1.5–2.4 s open; p90 105–187 ms per remote change) [human].

## Hotspots
Nothing measured yet. Largest files by `wc`: `Document.js` (29k), `Paragraph.js` (21k), `Table.js` (20k), `Styles.js` (18k), `Serialize2.js` (18k), `Run.js` (13k) [model].

## Available oracle
Nothing known in this directory; whether sdkjs has its own tests (e.g. `external/sdkjs/tests`) is not checked [model].

## Open questions
- Exact sizes, languages, fan-in/out: need `graph.json`.
- Is the proposed split right? Submodule boundaries are by file name, not by call graph.
- Where does open time go between parse (`Serialize2`), recalculation and first render?
- Is any sdkjs test suite runnable headless as an oracle?

## Lessons
- [PKT-0034] File-name groups exceeded 20k lines (model-core ~48k, paragraph ~79k by `wc`); split by file. Cards written: model-core, paragraph, serialize.
