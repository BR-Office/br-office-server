---
journey: open-docx-real-internet
goals_hash: dcb03039
round: 3
total_ms: 6601
measured_by: claude-opus-5-5
packet: PKT-0141
date: 2026-11-04
---
# Journey open-docx-real-internet: open-docx-real on an emulated 50/10 Mbps, 30 ms home link

Measure: `bash .theseus/oracle/journeys/open-docx-real-internet.sh` →
`total_ms=6601 min_ms=6580 max_ms=6895 runs=5` (plus one warm-up run, not counted: 6 955 ms). 11 pages in every run.
Build: **integrated**, via the existing `serve-integrated.sh up` (same build as PKT-0135's open-docx-real round 3).
Load average 2.0 before, 3.7 after. Headless Chromium, new browser per run (cold cache), 2-CPU VM.
Runner: `open-docx-real-internet-run.cjs` = `open-docx-real-run.cjs` plus
(1) CDP `Network.emulateNetworkConditions` {latency 30, down 50e6/8, up 10e6/8} on the page (all its frames);
(2) the upload is sent by the page's own `fetch` (FormData), so it pays the 10 Mbps uplink like a real user
(open-docx-real used `page.request`, outside the browser network stack);
(3) every response after the user's action is accounted from CDP `requestWillBeSent`/`loadingFinished` and attributed
by URL to the module that asks for it (per-run `dl` in the JSON lines).

## Marks (p50 of 5 runs, ms after the user's action)
| mark | p50 |
|---|---|
| upload response | 2 785 |
| api.js requested / loaded | 3 135 / 3 169 |
| `asc_LoadDocument` | 4 136 |
| Editor.bin requested / received | 4 541 / 4 556 |
| `isDocumentLoadComplete` | 6 150 |
| layout done + 2 rAF (**total**) | **6 601** |

x2t (converter log, docs `__7_`..`__11_`): 372, 187, 267, 373, 249 ms → p50 267.

## Downloads by requesting module (p50 per field across runs, after the user's action)
| module (asker) | requests | bytes (encoded) | first → last ms |
|---|---|---|---|
| sdkjs-common (sdk shared code, fonts `/fonts/`, wasm) | 58 | 1 257 615 | 16 → 5 106 |
| web-apps-documenteditor (app.js, css, images, locale) | 20 | 1 187 804 | 16 → 5 859 |
| sdkjs-word (word sdk-all, sdk-all-min) | 3 | 476 785 | 16 → 4 073 |
| web-apps api.js | 2 | 12 938 | 2 782 → 3 043 |
| project (example: upload response, editor page) | 3 | 11 324 | 0 → 3 624 |
| docservice Editor.bin / media | 1 / 7 | 0 reported (see caveat) | 4 133 / 5 602 → 5 857 |
| other | 2 | 553 | — |
Upload (uplink): 2.8 MB docx at 10 Mbps ≈ 2 240 ms theoretical; measured 2 785 ms including the example's save.

Surprise: ~2.9 MB of web-apps/sdkjs code is fetched from t=16 ms, long before the editor page exists: the example's
landing page runs the Document Server **preloader** (cache warm-up of web-apps/sdkjs) and it keeps downloading while
the upload goes up. On this link that preload overlaps the upload, so the editor shell boot (967 ms) is not the
3 MB of scripts it would otherwise cost (~470 ms of pure transfer at 50 Mbps).
Caveat: CDP reports 0 encoded bytes for Editor.bin and the media under `/cache/files/` (15 ms Editor.bin transfer);
these responses seem not to be throttled/accounted by the emulation (probably served via a path CDP does not see as
network, e.g. memory cache from the preloader or a worker). Not verified; follow-up below.

## Stages
Telescoping p50 marks (add up exactly). Client window Editor.bin→complete (1 594 ms) is split by the PKT-0043 CPU
shares as in open-docx-real (estimate, not a profile); under emulation it also waits on the throttled font and image
downloads (sdkjs-common fonts finish at 5 106, media at 5 857).

```yaml
total_ms: 6601
stages:
  - id: upload
    module: project
    files: [example service (packaged documentserver-example), browser uplink (emulated 10 Mbps)]
    functions: [fetch POST /example/upload (2.8 MB multipart), example upload handler (file save)]
    ms: 2785
    share: 42.2
  - id: example-editor-page
    module: project
    files: [example service /example/editor route, nginx]
    functions: [GET /example/editor (HTML render + 30 ms RTT)]
    ms: 350
    share: 5.3
  - id: api-js-load
    module: web-apps-documenteditor
    files: [web-apps/apps/api/documents/api.js]
    functions: [DocsAPI.DocEditor frame creation]
    ms: 34
    share: 0.5
  - id: editor-shell-boot
    module: web-apps-documenteditor
    files: [web-apps/apps/documenteditor/main/app.js, apps/documenteditor/main/app/controller/Main.js, sdkjs/word/sdk-all-min.js, sdkjs/common/AllFonts.js]
    functions: [DE.Controllers.Main.loadConfig, Main.loadDocument, Main.onEditorPermissions, baseEditorsApi.asc_LoadDocument (download of app/sdk scripts mostly served by the preloader)]
    ms: 967
    share: 14.6
  - id: server-open-docservice
    module: docservice
    files: [DocService/sources/DocsCoServer.js, DocService/sources/canvasservice.js, Common/sources/taskqueueRabbitMQ.js]
    functions: [canvasservice.commandOpen, commandOpenStartPromise, RabbitMQ round trip, websocket messages (+RTT)]
    ms: 138
    share: 2.1
  - id: server-open-x2t
    module: x2t
    files: [FileConverter/sources/converter.js, external/core/X2tConverter]
    functions: [converter.ExecuteTask, x2t docx→Editor.bin (p50 267 ms)]
    ms: 267
    share: 4.0
  - id: editor-bin-download
    module: project
    files: [nginx /cache/files]
    functions: [GET Editor.bin (asked by sdkjs-common apiBase; apparently not throttled, see caveat)]
    ms: 15
    share: 0.2
  - id: client-open-word
    module: sdkjs-word
    files: [external/sdkjs/word/Editor/Serialize2.js, word/Editor/Document.js, word/Editor/Paragraph.js, word/Editor/Run.js, word/Editor/Table.js, word/api.js]
    functions: [asc_docs_api.OpenDocumentFromBin, BinaryFileReader.Read, CDocument.Recalculate, CDocument.Recalculate_Page, ParaRun.Recalculate_Range]
    ms: 667
    share: 10.1
  - id: client-open-common
    module: sdkjs-common
    files: [external/sdkjs/common/libfont, fonts.wasm, /fonts/* (58 requests with the sdk), common/Images]
    functions: [check_loaded_list (font file downloads over the link), SetFontInternal, image loader LoadDocumentImages]
    ms: 373
    share: 5.7
  - id: client-open-webapps-ui
    module: web-apps-documenteditor
    files: [web-apps/apps/documenteditor/main/app.js, toolbar images/css]
    functions: [toolbar and views rendering after onDocumentContentReady]
    ms: 227
    share: 3.4
  - id: client-open-browser
    module: project
    files: [Chromium (Blink style/layout/paint, V8 GC, image decode, network emulation)]
    functions: [(program), (garbage collector), image decode]
    ms: 327
    share: 5.0
  - id: layout-finish-paint
    module: sdkjs-word
    files: [external/sdkjs/word/Editor/Document.js, word/Editor/Paragraph.js, word/Drawing]
    functions: [CDocument.Recalculate_Page (remaining pages on timer), page render with images, 2 rAF]
    ms: 451
    share: 6.8
unattributed_ms: 0
```
Sum: 2785+350+34+967+138+267+15+667+373+227+327+451 = 6 601.

By module: project 3 477 (52.7 %), web-apps-documenteditor 1 228 (18.6 %), sdkjs-word 1 118 (16.9 %),
sdkjs-common 373 (5.7 %), x2t 267 (4.0 %), docservice 138 (2.1 %).

## Comparison with earlier maps
No earlier `open-docx-real-internet` map (first). Against `open-docx-real.md` round 3 (PKT-0135, 4 974 ms, no throttling):
- +1 627 ms total, almost all in **upload** (75 → 2 785 ms): the uplink, plus the upload now going through the browser.
- The example editor page fell from 910 to 350 ms and the shell boot stayed near (878 → 967 ms): the preloader's
  downloads overlap the upload, so on a real link the 3 MB of client code is largely hidden behind the upload.
- After `asc_LoadDocument`, the open costs about the same (2 465 vs 2 696 ms): the server and client CPU dominate;
  download time of the client's own assets is a small part of what remains on this link.

## Follow-ups
- Verify why Editor.bin and `/cache/files/` media report 0 bytes under CDP and whether they are throttled; if not,
  the editor-bin-download stage is underestimated (~0.5–1 MB at 50 Mbps ≈ 100–200 ms). Spawn request in `.theseus/spawn/`.
