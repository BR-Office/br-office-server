---
id: sdkjs-common
title: sdkjs common — shared browser engine of the editors
kind: index
parent: null
paths: [external/sdkjs/common/]
languages: null                   # tool — no graph.json yet
size: null                        # tool — no graph.json yet (see Open questions)

base_commit: ddf327a176afef27551582d9f28192975572e069
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
Code shared by every sdkjs editor (word, cell, slide, pdf, visio): the base editor API, the co-editing client that talks to DocService, font loading and text shaping, the DrawingML shape/chart/SmartArt model and its binary serialization, history/undo, clipboard, plugins/macros, number formats and the canvas drawing base [model].

This is an **index card**: the module is far above the 20,000-line limit (about 395k lines of `.js` by `wc` over three directory levels, not a tool figure), so it must be split before any module-level card is written (spec §3).

## Proposed submodules
| Submodule | Paths | Role |
|---|---|---|
| common/api | `apiBase.js`, `apiBase_plugins.js`, `apiCommon.js`, `api/`, `commonDefines.js`, `errorCodes.js`, `editorscommon.js` | `baseEditorsApi`, shared constants, helpers [model] |
| common/coauth | `docscoapi.js`, `docscoapicommon.js`, `CollaborativeEditingBase.js`, `collaborativeHistory.js`, `applyDocumentChanges.js`, `collaboration/`, `TableId*.js`, `HistoryCommon.js` | `DocsCoApi` socket client (`init` ~1630, `saveChanges` ~838), change send/apply, undo, object ids [model] |
| common/fonts | `libfont/`, `GlobalLoaders.js`, `downloaderfiles.js` | `CGlobalFontLoader` (`GlobalLoaders.js` ~34), font engine (`libfont/engine/`), shaping, measuring [model] |
| common/drawings | `Drawings/`, `Shapes/` (except serializers), `geometry/`, `Overlay.js` | Shape model (`Drawings/Format/`), controller, hit/track, `GraphicsBase` [model] |
| common/charts | `Charts/`, `SerializeChart.js`, `Drawings/Format/Chart*.js` | Chart model, rendering (`ChartsDrawer.js`), chart serialization [model] |
| common/smartart | `SmartArts/`, `Drawings/Format/Data.js` | SmartArt layout tree [model] |
| common/serialize | `Shapes/Serialize*.js`, `SerializeCommonWordExcel.js`, `openxml.js`, `stringserialize.js`, `zlib/` | Binary/OOXML DrawingML reader-writer shared by formats [model] |
| common/text-io | `text_input*.js`, `clipboard_base.js`, `wordcopypaste.js`, `spell/`, `spellcheckapi.js`, `bidi/` | Input, clipboard, spellcheck, bidi [model] |
| common/extensions | `plugins/`, `plugins.js`, `macros.js`, `macro-recorder.js`, `custom-xml/`, `Merge/`, `versionHistory.js` | Plugins, macros, compare/merge, version history [model] |
| common/platform | `Native/`, `Local/`, `serviceworker/`, `embed/`, `browser.js`, `device_scale.js`, `Scrolls/`, `scroll.js`, `skin.js`, `Controls.js`, `hash/`, `digest/`, `NumFormat.js`, rest | Desktop/native shims, UI plumbing, crypto, number formats [model] |

## How they relate
Open: the editor's `baseEditorsApi` starts `DocsCoApi.init`, which connects to DocService and receives the document; the format-specific reader (e.g. word `Serialize2.js`) uses `common/serialize` for drawings; `CGlobalFontLoader` loads the fonts the document needs before layout — the packet's "14-25 font files per open" [human]. Co-editing: local edits become change objects registered through `HistoryCommon`/`TableId`, sent with `DocsCoApi.saveChanges`; remote changes are applied via `CollaborativeEditingBase` [model].

## Hotspots
Nothing measured yet. Largest files by `wc`: `Charts/ChartsDrawer.js` (21k), `Drawings/Format/Format.js` (21k), `Drawings/Format/ChartFormat.js` (20k), `editorscommon.js` (16k), `SerializeChart.js` (15k), `wordcopypaste.js` (15k), `Drawings/Format/ChartSpace.js` (14k), `Drawings/CommonController.js` (12k), `Shapes/Serialize.js` (12k) [model]. `Native/jquery_native.js` (9k) looks vendored [model].

## Available oracle
`external/sdkjs/tests/` exists with `common/`, `word/`, `cell/`… and `runAll.js`; `libfont/test/` has hyphen/shaper HTML pages. Not run; whether they run headless is unknown [model].

## Open questions
- Exact sizes, languages, fan-in/out: need `graph.json`.
- Is the proposed split right? Boundaries are by file name, not by call graph.
- How many font files does an open fetch, and serially or in parallel (`GlobalLoaders.js`, `downloaderfiles.js`)?
- Can `external/sdkjs/tests/common` run headless as an oracle?
- Why two classes `CDocsCoApi` (~41) and `DocsCoApi` (~561) in `docscoapi.js`?

## Lessons
Nothing known yet.
