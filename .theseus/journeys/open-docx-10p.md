---
journey: open-docx-10p
goals_hash: dcb03039
round: 3
total_ms: 8340
measured_by: claude-opus-5-5-b
packet: PKT-0126
date: 2026-11-03
---
# Journey open-docx-10p: select a 10-page docx until it is fully rendered (first open)

Measure: `bash .theseus/oracle/journeys/open-docx-10p.sh` →
`total_ms=8340 min_ms=5699 max_ms=8547 runs=5` (plus one warm-up run, not counted).
Build: **integrated**. `serve-integrated.sh up` overlays the sdkjs word bundle built from the fork's collecting branch
(`external/sdkjs` 0f61ccce) on the **native package** 9.3.7-1. core (x2t) and web-apps `theseus` == `main`, so the packaged
binaries are the integrated build for them. The server runs the packaged pkg binary (see the script header).
Each run: new browser and context (cold HTTP cache), headless Chromium (Playwright), 2-CPU VM. **The load average was
about 6 during the runs** (another agent was running the differential oracle at the same time; converter log 23:35), so
the spread (5.7–8.5 s) is mostly machine contention. Read shares, not absolute ms.

Sample: `.theseus/oracle/journeys/open-docx-10p.docx` (41 KB, text and tables, no images). **This build lays it out as
9 pages** (`pages: 9` in every run). The runner used to wait for 10 pages and hung forever, so it now waits until the
layout recalculation is finished (`CDocument.FullRecalc.Id == null`) and then two animation frames.

## Marks (p50 of 5 runs, ms after the user's action)
| mark | p50 | runs 0..4 |
|---|---|---|
| upload response (`POST /example/upload`) | 54 | 54 198 32 16 216 |
| api.js requested (example editor HTML received) | 1 926 | 2450 1926 1435 124 3063 |
| editor page DOMContentLoaded / api.js loaded | 2 620 | 2844 2620 1447 126 3247 |
| `asc_LoadDocument` called | 3 879 | 4613 3879 3311 1179 4539 |
| Editor.bin requested | 4 716 | 5509 4716 3653 1929 4886 |
| Editor.bin received | 5 071 | 5785 5490 4132 1965 5071 |
| `isDocumentLoadComplete` | 7 599 | 7599 7721 5548 4864 8066 |
| layout done + 2 rAF (**total**) | **8 340** | 8391 8340 6086 5699 8547 |

The `sdk` mark (sdk-all-min.js request) is not usable: the example's `preload.html` iframe fetches it before the action.
Converter log (`/var/log/euro-office/documentserver/converter/out.log`, Start Task → ExitCode for docs `__8_`..`__12_`):
x2t took 534, 299, 200, 454, 249 ms. **p50 299 ms.**

## Stages
Telescoping p50 marks (each is p50(end) − p50(start)), so the stages add up to exactly `total_ms`. The p50 of a
difference is not the difference of p50s, but they agree to within ~10 % here.
The client window Editor.bin→complete (2 528 ms) is split by module in proportion to the self-time shares that the
PKT-0043 CPU profile measured in the same window for the 10-page sample (`baseline.md` § "where the word editor's
CPU goes": word 40.9 %, common+fonts+min bundle 22.9 %, web-apps 13.9 %, browser 20.1 %, rescaled to 100 %). That is an
**estimate, not a profile of this round.** Making the split a measurement is the first follow-up.

```yaml
total_ms: 8340
stages:
  - id: upload
    module: project
    files: [example service (packaged documentserver-example, Node)]
    functions: [POST /example/upload]
    ms: 54
    share: 0.6
  - id: example-editor-page
    module: project
    files: [example service /example/editor route (packaged), nginx]
    functions: [GET /example/editor (server-side page render until the HTML arrives)]
    ms: 1872
    share: 22.4
  - id: api-js-load
    module: web-apps-documenteditor
    files: [web-apps/apps/api/documents/api.js]
    functions: [DocsAPI.DocEditor (frame creation), DOMContentLoaded of the example page]
    ms: 694
    share: 8.3
  - id: editor-shell-boot
    module: web-apps-documenteditor
    files: [web-apps/apps/documenteditor/main/app.js, apps/documenteditor/main/app/controller/Main.js, sdkjs/word/sdk-all-min.js, sdkjs/word/sdk-all.js]
    functions: [DE.Controllers.Main.loadConfig, Main.loadDocument, Main.onEditorPermissions, baseEditorsApi.asc_LoadDocument (common/apiBase.js)]
    ms: 1259
    share: 15.1
  - id: server-open-docservice
    module: docservice
    files: [DocService/sources/DocsCoServer.js, DocService/sources/canvasservice.js, DocService/sources/taskresult.js, Common/sources/taskqueueRabbitMQ.js]
    functions: [canvasservice.commandOpen, commandOpenStartPromise, taskresult upsert, RabbitMQ task queue round trip]
    ms: 538
    share: 6.5
  - id: server-open-x2t
    module: x2t
    files: [FileConverter/sources/converter.js, external/core/X2tConverter]
    functions: [converter.ExecuteTask, processDownloadFromStorage, x2t docx→Editor.bin (process 299 ms p50)]
    ms: 299
    share: 3.6
  - id: editor-bin-download
    module: project
    files: [nginx /cache/files (static)]
    functions: [GET Editor.bin]
    ms: 355
    share: 4.3
  - id: client-open-word
    module: sdkjs-word
    files: [external/sdkjs/word/Editor/Serialize2.js, word/Editor/Document.js, word/Editor/Paragraph.js, word/Editor/Run.js, word/Editor/Styles.js, word/Editor/Table.js, word/api.js]
    functions: [asc_docs_api.OpenDocumentFromBin, BinaryFileReader.Read, CDocument.Recalculate, CDocument.private_Recalculate, CDocument.Recalculate_Page, CDocument.private_UpdateTracks, Paragraph.Get_PosByElement, ParaRun.Recalculate_Range, CStyles construction]
    ms: 1057
    share: 12.7
  - id: client-open-common
    module: sdkjs-common
    files: [external/sdkjs/common/libfont, fonts.wasm, common/Drawings, sdkjs/word/sdk-all-min.js (base bundle)]
    functions: [SetFontInternal (textmeasurer), hb_get_script_horizontal_direction (fonts.wasm), font loading check_loaded_list, AscCommon.Hex.encode]
    ms: 592
    share: 7.1
  - id: client-open-webapps-ui
    module: web-apps-documenteditor
    files: [web-apps/apps/documenteditor/main/app.js, vendor jQuery]
    functions: [toolbar and views rendering after onDocumentContentReady]
    ms: 359
    share: 4.3
  - id: client-open-browser
    module: project
    files: [Chromium (Blink style/layout/paint, V8 GC, builtins)]
    functions: [(program), (garbage collector)]
    ms: 520
    share: 6.2
  - id: layout-finish-paint
    module: sdkjs-word
    files: [external/sdkjs/word/Editor/Document.js, word/Editor/Paragraph.js, word/Drawing]
    functions: [CDocument.Recalculate_Page (remaining pages after load complete, on timer), CDocument.private_Recalculate, Paragraph draw / page render, 2 rAF]
    ms: 741
    share: 8.9
unattributed_ms: 0
```
Sum: 54+1872+694+1259+538+299+355+1057+592+359+520+741 = 8 340.

By module: project (example service, nginx, browser) 2 801 ms (33.6 %), web-apps-documenteditor 2 312 (27.7 %),
sdkjs-word 1 798 (21.6 %), sdkjs-common 592 (7.1 %), docservice 538 (6.5 %), x2t 299 (3.6 %).

## Comparison with earlier maps
This is the first journey map file (no `.theseus/journeys/` before). Earlier numbers for the same path:
- Baseline PKT-0014 (Docker image): goto(editor) → `isDocumentLoadComplete` p50 3.15 s. PKT-0016 (native): 3.4–4.4 s
  from goto. This round: goto → complete = 7 599 − 54 = 7.5 s **including the example page**, and 4.98 s from DOMContentLoaded
  (2 620 → 7 599). The measures start at different points and this round ran on a loaded machine, so this is not a
  regression claim. Re-run on a quiet VM before comparing absolute numbers.
- Shares agree with round 2 / PKT-0043: after Editor.bin the client time is word layout first and fonts second. The
  server (DocService + x2t) is ~10 % of the journey and overlaps nothing in it (it starts only after `asc_LoadDocument`).
- New in this map: the **example service page (1.9 s p50, 0.1–3.1 s spread)** is the largest single stage. It is the
  test integrator, not Euro-Office, but it is on the journey as users of the example meet it. Its spread follows the
  machine load.
