---
journey: open-docx-real-internet
goals_hash: dcb03039
round: 3
total_ms: 8333
measured_by: claude-opus-5-5
packet: PKT-0141
date: 2026-11-04
---
# Journey open-docx-real-internet: open-docx-real on an emulated 50/10 Mbps, 30 ms home link

Measure: `bash .theseus/oracle/journeys/open-docx-real-internet.sh` →
`total_ms=8333 min_ms=7438 max_ms=8560 runs=5` (plus one warm-up run, not counted). 11 pages in every run.
Attempt 2 of PKT-0141 (attempt 1 measured 6 601 ms with the service worker active, see below).
Build: **integrated**, via the existing `serve-integrated.sh up` (same build as PKT-0135's open-docx-real round 3).
Load average 2.0 before, 3.7 after. Headless Chromium, new browser per run (cold cache), 2-CPU VM.
Runner: `open-docx-real-internet-run.cjs` = `open-docx-real-run.cjs` plus
(1) CDP `Network.emulateNetworkConditions` {latency 30, down 50e6/8, up 10e6/8} on the page (all its frames);
(2) the upload is sent by the page's own `fetch` (FormData), so it pays the 10 Mbps uplink like a real user
(open-docx-real used `page.request`, outside the browser network stack);
(3) every response after the user's action is accounted from CDP `requestWillBeSent`/`loadingFinished` and attributed
by URL to the module that asks for it (per-run `dl` in the JSON lines);
(4) **the service worker is blocked** (`serviceWorkers: 'block'` in the context + CDP `Network.setBypassServiceWorker`).
web-apps registers `apps/common/main/lib/util/docserviceworker.js`, and its fetches (Editor.bin, `/cache/files` media,
fonts) are made by the worker, outside the page's emulated link: attempt 1 saw Editor.bin as 0 bytes / 15 ms. On a first
open the worker's cache is empty anyway, so bypassing it is what a new user pays. The HTTP cache stays on (new context
per run), so the preloader's downloads are still reused as they would be for a real user. A test run with the cache
off too gave p50 8 375 ms, about the same.

## Marks (median run, painted = p50 8 333 ms; ms after the user's action)
| mark | ms |
|---|---|
| upload response | 2 819 |
| api.js requested / loaded | 3 186 / 3 221 |
| editor page DOMContentLoaded | 3 223 |
| `asc_LoadDocument` | 4 919 |
| Editor.bin requested / finished (Playwright events) | 5 267 / 5 574 |
| `isDocumentLoadComplete` | 7 843 |
| layout done + 2 rAF (**total**) | **8 333** |

x2t: 267 ms p50 (converter log, PKT-0141 attempt 1, same build and sample; not measured again).

## Downloads by requesting module (median run, CDP, after the user's action)
| module (asker) | requests | bytes (encoded) | first → last ms |
|---|---|---|---|
| sdkjs-common (sdk shared code, `/fonts/*`, wasm) | 58 | 12 861 163 | 10 → 6 184 |
| sdkjs-common: **Editor.bin** (asked by `common/apiBase.js`) | 1 | 25 098 | 4 026 → 4 096 (71 ms) |
| sdkjs-common: document media `/cache/files/` (image loader) | 7 | 1 065 072 | 6 662 → 6 923 |
| web-apps-documenteditor (app.js, css, images, locale) | 20 | 1 584 338 | 10 → 6 910 |
| sdkjs-word (word sdk-all, sdk-all-min) | 3 | 476 785 | 10 → 3 573 |
| web-apps api.js | 2 | 25 876 | 2 712 → 2 951 |
| project (example: upload response, editor page) | 3 | 11 331 | 0 → 3 582 |
| other | 2 | 553 | — |

Editor.bin and the media now go through the emulated link: 25 KB in 40–71 ms (30 ms RTT plus transfer) and
1.07 MB in 260–420 ms in every run. The fonts are the biggest download: sdkjs-common rose from 1.26 MB (attempt 1,
the worker served them) to 12.9 MB, about 2 s of pure transfer at 50 Mbps. Most of it overlaps the upload and the shell boot
(it starts at t=10 ms from the example's preloader and ends at ~6.2 s).
Clock caveat: the CDP times start at the upload request, the marks at the Node clock. In the median run the CDP
Editor.bin request (4 026) comes before the page's `asc_LoadDocument` mark (4 919) and the Playwright bin events (5 267). So the
stage below uses the Node-clock marks for the boundaries and the CDP transfer (71 ms) as the bin's true network share.
The rest of that window (236 ms) is Playwright event delay plus the client's queueing.

## Stages
Telescoping marks of the median run (they add up exactly). The client window binEnd→complete (2 269 ms) is split into
the media download (CDP, 261 ms) and the rest (2 008 ms) by the PKT-0043 CPU shares as in PKT-0135 (word 41.8 %,
common 23.4 %, web-apps 14.2 %, browser 20.5 %; an estimate, not a profile).

```yaml
total_ms: 8333
stages:
  - id: upload
    module: project
    files: [example service (packaged documentserver-example), browser uplink (emulated 10 Mbps)]
    functions: [fetch POST /example/upload (2.8 MB multipart), example upload handler (file save)]
    ms: 2819
    share: 33.8
  - id: example-editor-page
    module: project
    files: [example service /example/editor route, nginx]
    functions: [GET /example/editor (HTML render + 30 ms RTT)]
    ms: 369
    share: 4.4
  - id: api-js-load
    module: web-apps-documenteditor
    files: [web-apps/apps/api/documents/api.js]
    functions: [DocsAPI.DocEditor frame creation]
    ms: 35
    share: 0.4
  - id: editor-shell-boot
    module: web-apps-documenteditor
    files: [web-apps/apps/documenteditor/main/app.js, apps/documenteditor/main/app/controller/Main.js, sdkjs/word/sdk-all-min.js, sdkjs/common/AllFonts.js]
    functions: [DE.Controllers.Main.loadConfig, Main.loadDocument, Main.onEditorPermissions, baseEditorsApi.asc_LoadDocument (app/sdk scripts and fonts downloading over the link)]
    ms: 1696
    share: 20.4
  - id: server-open-docservice
    module: docservice
    files: [DocService/sources/DocsCoServer.js, DocService/sources/canvasservice.js, Common/sources/taskqueueRabbitMQ.js]
    functions: [canvasservice.commandOpen, commandOpenStartPromise, RabbitMQ round trip, websocket messages (+RTT)]
    ms: 81
    share: 1.0
  - id: server-open-x2t
    module: x2t
    files: [FileConverter/sources/converter.js, external/core/X2tConverter]
    functions: [converter.ExecuteTask, x2t docx→Editor.bin]
    ms: 267
    share: 3.2
  - id: editor-bin-download
    module: sdkjs-common
    files: [external/sdkjs/common/apiBase.js, nginx /cache/files]
    functions: [baseEditorsApi document load (GET Editor.bin, 25 KB, 71 ms on the emulated link; rest Playwright event delay)]
    ms: 307
    share: 3.7
  - id: media-download
    module: sdkjs-common
    files: [external/sdkjs/common/Images.js, nginx /cache/files/*/media]
    functions: [CGlobalImageLoader.LoadDocumentImages (7 images, 1.07 MB over 50 Mbps)]
    ms: 261
    share: 3.1
  - id: client-open-word
    module: sdkjs-word
    files: [external/sdkjs/word/Editor/Serialize2.js, word/Editor/Document.js, word/Editor/Paragraph.js, word/Editor/Run.js, word/Editor/Table.js, word/api.js]
    functions: [asc_docs_api.OpenDocumentFromBin, BinaryFileReader.Read, CDocument.Recalculate, CDocument.Recalculate_Page, ParaRun.Recalculate_Range]
    ms: 839
    share: 10.1
  - id: client-open-common
    module: sdkjs-common
    files: [external/sdkjs/common/libfont, fonts.wasm, /fonts/* (58 requests, 12.9 MB with the sdk)]
    functions: [check_loaded_list (font file downloads over the link), SetFontInternal, FontLoader.LoadDocumentFonts]
    ms: 470
    share: 5.6
  - id: client-open-webapps-ui
    module: web-apps-documenteditor
    files: [web-apps/apps/documenteditor/main/app.js, toolbar images/css]
    functions: [toolbar and views rendering after onDocumentContentReady]
    ms: 286
    share: 3.4
  - id: client-open-browser
    module: project
    files: [Chromium (Blink style/layout/paint, V8 GC, image decode, network emulation)]
    functions: [(program), (garbage collector), image decode]
    ms: 413
    share: 5.0
  - id: layout-finish-paint
    module: sdkjs-word
    files: [external/sdkjs/word/Editor/Document.js, word/Editor/Paragraph.js, word/Drawing]
    functions: [CDocument.Recalculate_Page (remaining pages on timer), page render with images, 2 rAF]
    ms: 490
    share: 5.9
unattributed_ms: 0
```
Sum: 2819+369+35+1696+81+267+307+261+839+470+286+413+490 = 8 333.

By module: project 3 601 (43.2 %), web-apps-documenteditor 2 017 (24.2 %), sdkjs-word 1 329 (15.9 %),
sdkjs-common 1 038 (12.5 %), x2t 267 (3.2 %), docservice 81 (1.0 %).

## Comparison with earlier maps
- PKT-0141 attempt 1 (6 601 ms, service worker active): +1 732 ms. The worker fetched Editor.bin, the media and most
  fonts off the emulated link. With it bypassed, the shell boot grows 967 → 1 696 ms (12.9 MB of fonts and the sdk now pay
  50 Mbps), the bin and the media add 568 ms, and the upload is the same (2 785 → 2 819).
- `open-docx-real.md` round 3 (PKT-0135, 4 974 ms, no throttling): +3 359 ms; upload +2 744 (uplink), shell boot +818
  (downloads), and the client open about the same CPU work plus the media.
- Lesson: on a real link the fonts (sdkjs-common, 12.9 MB) are the largest download of the journey, larger than all the code.

## Follow-ups
- Font payload: sdkjs-common downloads 12.9 MB of `/fonts/*` on a first open of this CJK-heavy docx (follow-up request in `.theseus/spawn/`).
