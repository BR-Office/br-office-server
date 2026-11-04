---
journey: open-docx-real
goals_hash: dcb03039
round: 3
total_ms: 4974
measured_by: claude-opus-5-5-b
packet: PKT-0135
date: 2026-11-04
---
# Journey open-docx-real: select a real 11-page docx (images, tables, CJK fonts) until fully rendered (first open)

Measure: `bash .theseus/oracle/journeys/open-docx-real.sh` →
`total_ms=4974 min_ms=3710 max_ms=5121 runs=5` (plus one warm-up run, not counted: 6 319 ms).
Sample: `.theseus/oracle/journeys/samples/aluno-moderno.docx` (2.8 MB). Lays out as **11 pages** in every run.
Build: **integrated**, via the existing `serve-integrated.sh up` (sdkjs word bundle of fork branch `theseus`
0f61ccce overlaid on the native package 9.3.7-1; core and web-apps `theseus` == `main`, packaged server binary).
Caveat (PKT-0131): x2t still loads the packaged `sdk-all.bin` snapshot, so the x2t stage is not the integrated sdkjs.
Each run: new browser and context (cold HTTP cache), headless Chromium (Playwright), 2-CPU VM.
Load average 0.8 before the runs, 3.3 at the end (the journey itself uses both CPUs); quieter than PKT-0126's round.
Runner: `open-docx-real-run.cjs`, a copy of `open-docx-10p-run.cjs` with only the file and timeout changed
(same marks, same end condition: `isDocumentLoadComplete`, then `FullRecalc.Id == null` + 2 rAF).

## Marks (p50 of 5 runs, ms after the user's action)
| mark | p50 | runs 0..4 |
|---|---|---|
| upload response (`POST /example/upload`) | 75 | 75 35 418 24 79 |
| api.js requested (example editor HTML received) | 985 | 1177 795 1371 145 985 |
| editor page DOMContentLoaded / api.js loaded | 1 400 | 1504 861 1492 147 1400 |
| `asc_LoadDocument` called | 2 278 | 2481 1843 2311 1178 2278 |
| Editor.bin requested | 2 878 | 3078 2472 2980 1614 2878 |
| Editor.bin received | 3 220 | 3390 2973 3339 1996 3220 |
| `isDocumentLoadComplete` | 4 503 | 4573 4251 4503 3185 4508 |
| layout done + 2 rAF (**total**) | **4 974** | 5121 4768 5013 3710 4974 |

Converter log (Start Task → ExitCode, docs `__1_`..`__5_`): x2t 360, 468, 459, 352, 394 ms, **p50 394 ms**.

## Stages
Telescoping p50 marks, so stages add up exactly to `total_ms`. The server window loadDoc→binReq (600 ms) is x2t
(converter log p50) plus the rest attributed to DocService. The client window Editor.bin→complete (1 283 ms = 4 503 − 3 220) is split
by module in proportion to the PKT-0043 CPU self-time shares (word 40.9, common 22.9, web-apps 13.9, browser 20.1,
rescaled): **an estimate, not a profile of this sample** — with images and CJK fonts the font/image share
(sdkjs-common) is likely higher than for the text-only 10-page sample. Profiling this window is the first follow-up.

```yaml
total_ms: 4974
stages:
  - id: upload
    module: project
    files: [example service (packaged documentserver-example, Node)]
    functions: [POST /example/upload]
    ms: 75
    share: 1.5
  - id: example-editor-page
    module: project
    files: [example service /example/editor route (packaged), nginx]
    functions: [GET /example/editor (server-side page render until the HTML arrives)]
    ms: 910
    share: 18.3
  - id: api-js-load
    module: web-apps-documenteditor
    files: [web-apps/apps/api/documents/api.js]
    functions: [DocsAPI.DocEditor (frame creation), DOMContentLoaded of the example page]
    ms: 415
    share: 8.3
  - id: editor-shell-boot
    module: web-apps-documenteditor
    files: [web-apps/apps/documenteditor/main/app.js, apps/documenteditor/main/app/controller/Main.js, sdkjs/word/sdk-all-min.js, sdkjs/word/sdk-all.js]
    functions: [DE.Controllers.Main.loadConfig, Main.loadDocument, Main.onEditorPermissions, baseEditorsApi.asc_LoadDocument (common/apiBase.js)]
    ms: 878
    share: 17.7
  - id: server-open-docservice
    module: docservice
    files: [DocService/sources/DocsCoServer.js, DocService/sources/canvasservice.js, DocService/sources/taskresult.js, Common/sources/taskqueueRabbitMQ.js]
    functions: [canvasservice.commandOpen, commandOpenStartPromise, taskresult upsert, RabbitMQ task queue round trip]
    ms: 206
    share: 4.1
  - id: server-open-x2t
    module: x2t
    files: [FileConverter/sources/converter.js, external/core/X2tConverter]
    functions: [converter.ExecuteTask, processDownloadFromStorage, x2t docx→Editor.bin (process 394 ms p50; images extracted to media/)]
    ms: 394
    share: 7.9
  - id: editor-bin-download
    module: project
    files: [nginx /cache/files (static)]
    functions: [GET Editor.bin]
    ms: 342
    share: 6.9
  - id: client-open-word
    module: sdkjs-word
    files: [external/sdkjs/word/Editor/Serialize2.js, word/Editor/Document.js, word/Editor/Paragraph.js, word/Editor/Run.js, word/Editor/Styles.js, word/Editor/Table.js, word/api.js]
    functions: [asc_docs_api.OpenDocumentFromBin, BinaryFileReader.Read, CDocument.Recalculate, CDocument.Recalculate_Page, ParaRun.Recalculate_Range, CTable recalculation]
    ms: 537
    share: 10.8
  - id: client-open-common
    module: sdkjs-common
    files: [external/sdkjs/common/libfont, fonts.wasm, common/Drawings, common/Images (image loader)]
    functions: [SetFontInternal (textmeasurer), check_loaded_list (CJK font files), hb_get_script_horizontal_direction (fonts.wasm), image loader LoadDocumentImages]
    ms: 300
    share: 6.0
  - id: client-open-webapps-ui
    module: web-apps-documenteditor
    files: [web-apps/apps/documenteditor/main/app.js, vendor jQuery]
    functions: [toolbar and views rendering after onDocumentContentReady]
    ms: 182
    share: 3.7
  - id: client-open-browser
    module: project
    files: [Chromium (Blink style/layout/paint, V8 GC, image decode)]
    functions: [(program), (garbage collector), image decode]
    ms: 264
    share: 5.3
  - id: layout-finish-paint
    module: sdkjs-word
    files: [external/sdkjs/word/Editor/Document.js, word/Editor/Paragraph.js, word/Drawing]
    functions: [CDocument.Recalculate_Page (remaining pages on timer), CDocument.private_Recalculate, page render with images, 2 rAF]
    ms: 471
    share: 9.5
unattributed_ms: 0
```
Sum: 75+910+415+878+206+394+342+537+300+182+264+471 = 4 974.

By module: project 1 591 ms (32.0 %), web-apps-documenteditor 1 475 (29.7 %), sdkjs-word 1 008 (20.3 %),
x2t 394 (7.9 %), sdkjs-common 300 (6.0 %), docservice 206 (4.1 %).

## Comparison with earlier maps
No earlier `open-docx-real` map (this is its first). Nearest: `open-docx-10p.md` round 3 (PKT-0126, 8 340 ms, load ~6).
- This real 2.8 MB document opened faster in absolute terms (4 974 ms) than the 41 KB 10-page sample did yesterday:
  the machine was much quieter, so absolute numbers are not comparable across the two rounds.
- Shares that differ and are document-driven: **x2t 7.9 % vs 3.6 %** (394 vs 299 ms, the images and size),
  **Editor.bin download 6.9 % vs 4.3 %** (342 ms: bigger binary plus media). Client layout + paint (word) stays near 20 % (20.3 %).
- The example service page is again a large stage (910 ms, 145–1 371 spread) and remains test-integrator time.

## Follow-ups
- Profile the client window (Editor.bin → last paint) for this sample with a CPU profile, to replace the PKT-0043
  proportional split, especially fonts (CJK) and image loading. Requested as a spawn request in `.theseus/spawn/`.

Correction (attempt 2): the first version took 3 339 ms as the Editor.bin-received p50 (the median of the
unsorted run list); the sorted median is 3 220 ms. Download and client-window stages were recomputed.
