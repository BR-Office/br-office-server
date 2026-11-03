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
  level: unit                     # PKT-0046: narrow, see Available oracle
  sources:
    - .theseus/oracle/sdkjs-common.sh

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
`.theseus/oracle/sdkjs-common.sh [filter]` (PKT-0046) runs `external/sdkjs/tests/common` headless with node-qunit-puppeteer on the preinstalled Playwright Chromium. First run does the setup (`npm ci` in build, `npm run develop`, ~2 min); after that ~15 s. Measured 2026-11-02 on the 2-CPU VM [tool]:

| Suite | Result | Time |
|---|---|---|
| common/api/api.html (word), api-cell, api-slide, api-visio | PASS 75/75 each | 4-6 s each |
| common/api/*-compiled.html (4) | skipped: load `deploy/` bundles, need a full `npm run build` | — |
| common/color-mods/color-mods.html | green since PKT-0090: 10023/10023, one assertion per case with ±1 tolerance on R, G, B, A (float vs Office fixed point); not in upstream `runAll.js` | ~7 s |
| common/charts/chartEx-serialize.html | green since PKT-0090: 4/4 from a "Page boots" test (3 boot checks + `assert.throws` with a `TypeError` matcher pinning that serializing a `CChartSpace` via `OpenXmlPackage.getXmlBytes` throws); "Compare 1xml" is `QUnit.test.skip` (no chartEx XML serializer here: `CChartSpace` only has the generic `CBaseNoIdObject` `fromXml`/`toXml` stubs; only the getXmlBytes path throws, a bare `toXml(new CMemory(), name)` does not). Page loads slide scripts only plus `g_fonts_selection_bin = ""`; not in upstream `runAll.js` | ~7 s |

Green oracle: 6/6 suites green (`known` empty since PKT-0090), 10327/10327 assertions, ~19 s; the runner fails if no suite runs (e.g. a filter that matches nothing). **Coverage is narrow**: the api suites check the Builder API surface (`common/apiBase*`, `api/`) only. Not covered: font loading (`GlobalLoaders.js`, `libfont/`), co-editing send/apply (`docscoapi.js`, `CollaborativeEditingBase.js`), history/undo, DrawingML serialization, charts and SmartArt layout, clipboard. A refactor in those areas must bring its own check (e.g. the word suites via `.theseus/oracle/sdkjs-word.sh`, which exercise common code indirectly, or a new characterization test). `libfont/test/` pages were not tried. Why color-mods and chartEx fail: see PKT-0058 below; PKT-0090 repaired the test pages.

## Open questions
- Exact sizes, languages, fan-in/out: need `graph.json`.
- Is the proposed split right? Boundaries are by file name, not by call graph.
- How many font files does an open fetch, and serially or in parallel (`GlobalLoaders.js`, `downloaderfiles.js`)?
- Why two classes `CDocsCoApi` (~41) and `DocsCoApi` (~561) in `docscoapi.js`?

## Lessons
- `tests/common` has more suites than upstream `runAll.js` lists; the unlisted ones (color-mods, chartEx-serialize) were red until PKT-0090 repaired them (PKT-0046). chartEx stays a boot check only: it does not exercise chartEx serialization.
- PKT-0058 diagnosis: **color-mods** is a test-precision mismatch, not a defect: every failing assertion is off by exactly ±1 on one 0-255 channel (sdkjs computes in floating point, expectations follow Office fixed-point truncation, e.g. alphaMod 25000 on A=128 → 32 vs expected 31); the file's unused `IS_APPROX_EQUALS` switch covers RGB only. **chartEx-serialize** is a test bug that hangs deterministically: the page loads no `common/AllFonts.js`, `new asc_docs_api` throws in `CFontSelectList.Init` (`g_fonts_selection_bin` undefined passes the `!= ""` guard) inside jQuery ready, so QUnit (autostart=false) never starts. With the global stubbed it finishes in ~3 s but fails 13/13: cell+slide+word scripts redeclare globals in one page, and `CChartSpace` has no `fromXml`/`toXml` (test adapted from a vsdx test, targets a serializer absent here). Neither is environmental.
