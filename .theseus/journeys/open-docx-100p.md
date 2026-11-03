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
+ the rest to DocService. Client window Editor.bin→complete (1 129 ms) is split by the PKT-0043 CPU-profile self-time
shares (word 40.9, common 22.9, web-apps 13.9, browser 20.1, rescaled): an **estimate**, as in the 10p map.

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
  - id: editor-bin-download
    module: project
    files: [nginx /cache/files]
    functions: [GET Editor.bin]
    ms: 646
    share: 14.0
  - id: client-open-word
    module: sdkjs-word
    files: [external/sdkjs/word/Editor/Serialize2.js, word/Editor/Document.js, word/Editor/Paragraph.js, word/Editor/Run.js, word/Editor/Styles.js, word/api.js]
    functions: [asc_docs_api.OpenDocumentFromBin, BinaryFileReader.Read, CDocument.Recalculate, CDocument.Recalculate_Page, ParaRun.Recalculate_Range]
    ms: 473
    share: 10.2
  - id: client-open-common
    module: sdkjs-common
    files: [external/sdkjs/common/libfont, fonts.wasm, common/Drawings]
    functions: [SetFontInternal, hb_get_script_horizontal_direction, check_loaded_list]
    ms: 264
    share: 5.7
  - id: client-open-webapps-ui
    module: web-apps-documenteditor
    files: [web-apps/apps/documenteditor/main/app.js]
    functions: [toolbar and views rendering after onDocumentContentReady]
    ms: 160
    share: 3.5
  - id: client-open-browser
    module: project
    files: [Chromium (Blink, V8 GC)]
    functions: [(program), (garbage collector)]
    ms: 232
    share: 5.0
  - id: layout-finish-paint
    module: sdkjs-word
    files: [external/sdkjs/word/Editor/Document.js, word/Editor/Paragraph.js, word/Drawing]
    functions: [CDocument.Recalculate_Page (pages after load complete, on timer), CDocument.private_Recalculate, page draw, 2 rAF]
    ms: 1250
    share: 27.0
unattributed_ms: 0
```
Sum: 21+139+5+1022+173+243+646+473+264+160+232+1250 = 4 628.

By module: sdkjs-word 1 723 (37.2 %), web-apps-documenteditor 1 187 (25.6 %), project 1 038 (22.4 %),
sdkjs-common 264 (5.7 %), x2t 243 (5.3 %), docservice 173 (3.7 %).

## Comparison with earlier maps
No earlier open-docx-100p map. Against open-docx-10p (PKT-0126, same round, loaded machine, 8 340 ms):
- The 100p total is *lower* only because the example page (1.9 s p50 there, 0.14 s here) and shell boot were inflated by
  load in PKT-0126. Size-dependent stages grow with pages: layout after load complete 741 → 1 250 ms, Editor.bin download
  355 → 646 ms; x2t barely moves (299 → 243, noise).
- The background layout of the remaining pages (`layout-finish-paint`, 27 %) is the largest stage at 100 pages:
  sdkjs-word owns the journey's size scaling. Baseline (PKT-0014/16) also found +0.5 s for 10 → 100 pages.
- Editor.bin "download" includes the time between the request and the client finishing reading the response on a
  busy main thread; a network/CPU split needs a trace.
