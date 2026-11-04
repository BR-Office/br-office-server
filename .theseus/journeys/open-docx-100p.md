---
journey: open-docx-100p
goals_hash: dcb03039
round: 3
total_ms: 4628
measured_by: claude-opus-5-5
packet: PKT-0127
date: 2026-11-03
---
# Journey open-docx-100p: select a 100-page docx until it is fully rendered (first open)

Measure: `bash .theseus/oracle/journeys/open-docx-100p.sh` → `total_ms=4628 min_ms=4493 max_ms=5671 runs=5`
(plus one warm-up run, not counted). Build: **integrated** (`serve-integrated.sh up`: sdkjs word bundle of the fork's
collecting branch, `external/sdkjs` 0f61ccce, overlaid on the native package; core and web-apps `theseus` == `main`).
Runner = the PKT-0126 10p runner with the sample swapped (`open-docx-100p-run.cjs`, timeout 240 s).
Sample: `.theseus/oracle/journeys/open-docx-100p.docx` = `large-100p.docx` of PKT-0016 (89 KB, from the example's
store). **This build lays it out as 86 pages** in every run (the runner waits for the layout to finish, not a count).
Each run: new browser (cold HTTP cache), headless Chromium, 2-CPU VM, load average ~2.6–3.2 during the runs.

## Marks (p50 of 5 runs, ms after the user's action)
| mark | p50 | runs 0..4 |
|---|---|---|
| upload response | 21 | 21 97 8 13 31 |
| api.js requested | 160 | 160 1389 102 97 662 |
| editor page DOMContentLoaded / api.js loaded | 165 | 165 1731 110 103 737 |
| `asc_LoadDocument` called | 1 187 | 1187 2615 1013 1177 1895 |
| Editor.bin requested | 1 603 | 1504 2895 1329 1603 2174 |
| Editor.bin received | 2 249 | 1556 2943 1354 2249 2776 |
| `isDocumentLoadComplete` | 3 378 | 3304 4607 3378 3364 3956 |
| layout done + 2 rAF (**total**) | **4 628** | 4544 5671 4628 4493 4949 |

Converter log (Start Task → ExitCode, runs 0..4): x2t 246, 210, 265, 243, 185 ms, **p50 243**.

## Stages
Telescoping p50 marks, so they add up exactly to `total_ms`. Server window (loadDoc→binReq, 416 ms) = x2t p50 (243)
+ the rest to DocService. Client stages are split by **measured self-time per module** (PKT-0134, below), rescaled to the timed p50 windows.

## Client CPU profile (PKT-0134): measured self-time per module
`PROFILE=1 RUNS=5 node .theseus/oracle/journeys/open-docx-100p-run.cjs` (via the same env as the .sh): 5 separate
profiled runs (CDP Profiler, 100 us sampling, + CDP Network of Editor.bin), never mixed with the timed runs (the
profiler slows the page: painted p50 ~6.9 s there vs 4.6 s timed). Attribution as PKT-0045: the served word bundles
are mapped to `external/sdkjs` source files by anchors (sdk-all.js 367/393 files located, sdk-all-min.js 33/42);
sdkjs-unmapped self-time ≤ 2 ms. Integrated build, 86 pages, same VM. Self-time, p50 per module, ms (profiled runs):

| window | length | sdkjs-word | sdkjs-common | web-apps | browser (program+native+GC) | idle |
|---|---|---|---|---|---|---|
| Editor.bin request → loadingFinished | 95 | 0 | 0 | 0 | 84 | 34 |
| loadingFinished → isDocumentLoadComplete | 1 856 | 626 | 266 | 176 | 540 | 238 |
| complete → painted (layout of the rest + 2 rAF) | 1 430 | 444 | 265 | 179 | 214 | 325 |

**Editor.bin download split:** network is only ~95 ms (ttfb 35 + body 55, CDP Network timestamps). The other ~550 ms of
the old `editor-bin-download` stage (646) is the open itself: the client starts reading the bin on `xhr.onload` and
Playwright's `requestfinished` arrives ~559 ms (p50) after CDP `loadingFinished`, behind a busy main thread. So the
timed window binReq+95 → complete (1 680 ms) is split by the "open" row and complete → painted (1 250 ms) by the
"layout" row, both rescaled; idle time is a stage of its own (project).

Top self-time files (median run): open: word/Editor/Styles.js 97, web-apps app.js 76, jquery 72, Paragraph.js 71,
Serialize2.js 68, Run.js 58, fonts wasm 49; layout: fonts wasm 107, Run.js 102 (Recalculate_LineMetrics,
Recalculate_Range), app.js 71, jquery 67, ParagraphChanges.js 58 (private_RecalculateLine). The browser's own
`(program)` (~350 ms in the open) is the largest single bucket: style/layout of the UI and V8 compile.

```yaml
total_ms: 4628
stages:
  - id: upload
    module: project
    files: [example service (packaged documentserver-example)]
    functions: [POST /example/upload]
    ms: 21
    share: 0.5
  - id: example-editor-page
    module: project
    files: [example service /example/editor route, nginx]
    functions: [GET /example/editor]
    ms: 139
    share: 3.0
  - id: api-js-load
    module: web-apps-documenteditor
    files: [web-apps/apps/api/documents/api.js]
    functions: [DocsAPI.DocEditor]
    ms: 5
    share: 0.1
  - id: editor-shell-boot
    module: web-apps-documenteditor
    files: [web-apps/apps/documenteditor/main/app.js, apps/documenteditor/main/app/controller/Main.js, sdkjs/word/sdk-all-min.js, sdkjs/word/sdk-all.js]
    functions: [DE.Controllers.Main.loadConfig, Main.loadDocument, Main.onEditorPermissions, baseEditorsApi.asc_LoadDocument]
    ms: 1022
    share: 22.1
  - id: server-open-docservice
    module: docservice
    files: [DocService/sources/DocsCoServer.js, DocService/sources/canvasservice.js, DocService/sources/taskresult.js, Common/sources/taskqueueRabbitMQ.js]
    functions: [canvasservice.commandOpen, commandOpenStartPromise, taskresult upsert, RabbitMQ task round trip]
    ms: 173
    share: 3.7
  - id: server-open-x2t
    module: x2t
    files: [FileConverter/sources/converter.js, external/core/X2tConverter]
    functions: [converter.ExecuteTask, x2t docx→Editor.bin]
    ms: 243
    share: 5.3
  - id: editor-bin-network
    module: project
    files: [nginx /cache/files]
    functions: [GET Editor.bin (CDP Network: ttfb 35 + body 55 ms)]
    ms: 95
    share: 2.1
  - id: client-open-word
    module: sdkjs-word
    files: [external/sdkjs/word/Editor/Styles.js, word/Editor/Paragraph.js, word/Editor/Serialize2.js, word/Editor/Run.js, word/Editor/Document.js, word/Editor/RunChanges.js]
    functions: [CStyle.Copy, Binary_DocumentTableReader.ReadText, Paragraph.Get_PosByElement, CDocument.Recalculate]
    ms: 576
    share: 12.4
  - id: client-open-common
    module: sdkjs-common
    files: [external/sdkjs/common/Drawings/Externals.js, common/libfont/textshaper.js, common/libfont/map.js, fonts.wasm]
    functions: [xhr.onload (font files), CTextShaper.private_CheckNewSegment, fonts wasm]
    ms: 241
    share: 5.2
  - id: client-open-webapps-ui
    module: web-apps-documenteditor
    files: [web-apps/apps/documenteditor/main/app.js, web-apps/vendor/jquery/jquery.min.js]
    functions: [toolbar and views rendering, jQuery]
    ms: 159
    share: 3.4
  - id: client-open-browser
    module: project
    files: [Chromium (Blink, V8 GC)]
    functions: ["(program)", "(garbage collector)", native (drawImage, getPropertyValue)]
    ms: 489
    share: 10.6
  - id: client-open-idle
    module: project
    files: [Chromium main thread idle]
    functions: ["(idle) — waiting on font/resource loads and timers"]
    ms: 215
    share: 4.6
  - id: layout-finish-paint
    module: sdkjs-word
    files: [external/sdkjs/word/Editor/Run.js, word/Editor/ParagraphChanges.js, word/Editor/Paragraph.js, word/Editor/Paragraph_Recalculate.js, word/Editor/Document.js]
    functions: [ParaRun.Recalculate_LineMetrics, ParaRun.Recalculate_Range, Paragraph.private_RecalculateLine]
    ms: 389
    share: 8.4
  - id: layout-finish-common
    module: sdkjs-common
    files: [fonts.wasm, external/sdkjs/common/libfont/engine.js, common/Drawings/Externals.js]
    functions: [fonts wasm (shaping/glyphs), LoadFont]
    ms: 232
    share: 5.0
  - id: layout-finish-webapps
    module: web-apps-documenteditor
    files: [web-apps/apps/documenteditor/main/app.js, main/code.js, vendor/jquery, vendor/requirejs]
    functions: [deferred UI modules (execCb, __webpack_require__), jQuery]
    ms: 157
    share: 3.4
  - id: layout-finish-browser
    module: project
    files: [Chromium (Blink, V8 GC)]
    functions: ["(program)", "(garbage collector)", native, 2 rAF]
    ms: 187
    share: 4.0
  - id: layout-finish-idle
    module: project
    files: [Chromium main thread idle]
    functions: ["(idle) between recalculation timer slices"]
    ms: 285
    share: 6.2
unattributed_ms: 0
```
Sum: 21+139+5+1022+173+243+95 + (576+241+159+489+215) + (389+232+157+187+285) = 4 628.

By module: project 1 431 (30.9 %), web-apps-documenteditor 1 343 (29.0 %), sdkjs-word 965 (20.9 %),
sdkjs-common 473 (10.2 %), x2t 243 (5.3 %), docservice 173 (3.7 %).

## Comparison with earlier maps
No earlier open-docx-100p map. Against open-docx-10p (PKT-0126, same round, loaded machine, 8 340 ms):
- The 100p total is *lower* only because the example page (1.9 s p50 there, 0.14 s here) and shell boot were inflated by
  load in PKT-0126. Size-dependent stages grow with pages: layout after load complete 741 → 1 250 ms, Editor.bin download
  355 → 646 ms; x2t barely moves (299 → 243, noise).
- The background layout of the remaining pages (`layout-finish-paint`, 27 %) is the largest stage at 100 pages:
  sdkjs-word owns the journey's size scaling. Baseline (PKT-0014/16) also found +0.5 s for 10 → 100 pages.
- Editor.bin "download" (646 ms in PKT-0127) was mostly main-thread time, not network (PKT-0134: network ~95 ms).
- PKT-0127 estimated sdkjs-word at 1 723 ms (37 %) from PKT-0043 shares; measured it is 965 ms (21 %): the client
  window is browser-bound ((program), GC, idle) and web-apps UI more than the estimate assumed.
