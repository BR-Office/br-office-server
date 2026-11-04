---
goals_hash: dcb03039
packet: PKT-0013
date: 2026-11-02
machine: sandbox, Linux 6.18, Node v22.23.4 (single run, numbers are indicative ±20%)
---

# Performance baseline

## Where users feel it

| Scenario | What the user waits for | Where it runs | Repository |
|---|---|---|---|
| **Open** | document appears in the browser | server: DocService (auth, `canvasservice.js`, cache lookup) → FileConverter (`x2t`, C++ binary) → client: sdkjs loads `Editor.bin` and renders | server: this repo; x2t: `core` (C++, not here); rendering: `sdkjs` / `web-apps` (not here) |
| **Co-edit** | others' changes and lock answers appear | server: `DocsCoServer.js` (Socket.IO, locks, change storage in DB, pub/sub via Redis/RabbitMQ); client: sdkjs applies changes | this repo + `sdkjs` |
| **Save** | "saved" / callback to the integrator | server: DocsCoServer → convert changes with x2t → storage → callback | this repo + `core` |
| **Convert** | ConvertService response | server: `converterservice.js` → queue → FileConverter → x2t | this repo + `core` |

Most of the CPU in open / save / convert is in **x2t (C++)** and the **client (sdkjs, JavaScript in the browser)**,
neither of which is in this repository. The Node.js server is mostly coordination: I/O, queues, JSON,
locks. Its own cost matters most for **co-edit latency and throughput** (per-message work in `DocsCoServer.js`).

## Speed: what can be measured here today

Script: `node .theseus/oracle/perf/bench-hotpaths.js` (from the repository root; no DB/Redis/RabbitMQ needed,
uses the in-memory editor data). Micro-benchmarks of per-action server hot paths:

| Benchmark | Scenario | p50 | p99 | Throughput (1 core) |
|---|---|---|---|---|
| `coedit.parse+stringify(50 changes)` | co-edit, per `saveChanges` message | 60.5 µs | 184.6 µs | ~14 000 msg/s |
| `coedit.locks add/get/remove` (`editorDataMemory`) | co-edit, lock round trip | 4.5 µs | 22.5 µs | ~159 000 op/s |
| `coedit.addMessage` (`editorDataMemory`) | co-edit, message queue | 0.44 µs | 1.85 µs | ~1.8 M msg/s |
| `open.formatBySignature(pdf)` (`formatchecker`) | open / convert | 0.92 µs | 5.4 µs | ~760 000 op/s |
| `open.formatBySignature(zip)` | open / convert | 0.91 µs | 2.1 µs | ~860 000 op/s |
| `open.formatFromString` | open / convert | 0.22 µs | 0.67 µs | ~3.8 M op/s |

Reading: JSON handling of change batches is the dominant in-process cost found so far (≈ 60 µs per 50-change
message), two orders of magnitude above lock or format-detection work. All are far below network,
database and x2t latencies (milliseconds to seconds), so **a language change of these paths alone would not
be felt by users**; the end-to-end numbers below are needed before any such decision.

## Client (browser editors): measured (PKT-0014)

Script: `node .theseus/oracle/perf/client-perf.js [runs]` against the full stack in Docker
(`ghcr.io/euro-office/documentserver:latest`, client build 9.3.7). It must be started with
`-e JWT_ENABLED=false -e EXAMPLE_ENABLED=true -e ALLOW_PRIVATE_IP_ADDRESS=true`: without the last flag the
server's SSRF guard refuses to download from the example on localhost and the document never loads.
Headless Chromium (Playwright), document editor (docx), new empty document from the example, two users in
separate browser contexts. 2-CPU VM, 2026-11-02, 5 runs (open) / 100 keystrokes / 25 remote edits.

| Scenario | Measured from → to | p50 | p90 | min–max |
|---|---|---|---|---|
| **Open + render** (first user, new docx) | `goto(editor)` → `editor.isDocumentLoadComplete` | 3.15 s | 3.84 s | 2.87–3.84 s |
| **Join co-edit** (second user, same doc) | `goto` → load complete | 3.51 s | 3.69 s | 2.97–3.69 s |
| **Typing latency** (local) | key press → char in sdkjs model → next animation frame | 31 ms | 68 ms | 14–119 ms |
| **Remote change applied** (fast co-edit) | A types → text present in B's model | 101 ms | 361 ms | 73–793 ms |
| **Memory** (JS heap, editor iframe, after edits) | `performance.memory.usedJSHeapSize` | 73 MB | — | 73–78 MB |

A second 3-run pass gave remote apply p50 90 ms / p90 233 ms and the same heap, so the order of magnitude is stable.

Reading:
- **Open** is dominated by the client: loading and parsing the sdkjs/web-apps bundles and fonts plus
  rendering (≈3 s), against server hot paths in the micro-second range and an x2t conversion of an
  empty docx. Not split further here (see gaps).
- **Remote apply** p50 ≈ 0.1 s includes A's client batching, Socket.IO, DocsCoServer, B's apply. The
  server per-message cost measured above (≈60 µs) is < 0.1 % of it; the tail (p90 0.2–0.4 s) needs a
  breakdown before blaming any component.
- **Typing** is client-only and already below the ~50 ms perception threshold at p50.
- These are a lower bound on content cost: an empty document. Large documents, xlsx/pptx and a real
  network are not covered.

## Client: open and co-edit breakdown on realistic documents (PKT-0016)

Script: `node .theseus/oracle/perf/client-breakdown.js <dir> [runs]`; raw output (one JSON line per file) in
`perf/client-breakdown-2026-11-02.json`. **Native package** `euro-office-documentserver` 9.3.7-1 (not Docker),
example on port 80, JWT on, `allowPrivateIPAddress` on, same VM (2 CPUs) for server and Chromium.
Samples generated with python-docx/openpyxl/python-pptx (text, headings, tables; no images):
docx 10 pages (41 KB) and 100 pages (79 KB), xlsx 10 000 rows × 5 columns with formulas (432 KB), pptx 50 slides (76 KB).
3 opens per file, each in a new browser context (cold HTTP cache).

Open, p50 (max) in ms from `goto`, from the editor frame's Performance API resource timings:

| File | Total | Last sdkjs/web-apps script in | Editor.bin requested | Editor.bin received | After Editor.bin → load complete |
|---|---|---|---|---|---|
| docx 10 p | 3 392 (3 727) | 1 526 | 1 493 | 1 563 | 1 860 |
| docx 100 p | 4 168 (4 287) | 1 515 | 1 676 | 1 893 | 2 394 |
| xlsx 10 k rows | 4 383 (4 665) | 2 304 | 2 452 | 2 930 | 1 453 |
| pptx 50 slides | 3 945 (4 545) | 1 860 | 1 601 | 1 648 | 2 271 |

Each open loads 12–13 scripts (~500 KB transferred), 14–25 font files and ~25 other resources.

Co-edit (docx, 2 users, 30 sequential markers of 4–5 characters typed by A; A's WebSocket send and B's
WebSocket message of `saveChanges` timestamped in the page with the host clock):

| File | Total p50 / p90 / max | A: last key → change sent | Wire: A sent → B received (Socket.IO + DocsCoServer) | B: received → marker in model |
|---|---|---|---|---|
| docx 10 p | 116 / 182 / 195 | 6 / 38 / 42 | 6 / 9 / 15 | 42 / 143 / 155 |
| docx 100 p | 137 / 223 / 280 | 31 / 42 / 50 | 8 / 15 / 20 | 73 / 105 / 187 |

Total also includes typing the marker (~20 ms per run of `keyboard.type`). Typing (key → char in model →
next frame): p50 75 ms / p90 119 ms (10 p), p50 80 / p90 156 ms (100 p).

Reading:
- **Open ≈ 3.4–4.4 s and grows mostly in the client.** ~1.5 s goes to the editor scripts (2.3 s for the
  spreadsheet editor); the server's open (auth, x2t conversion, Editor.bin) overlaps with the script
  load and Editor.bin itself arrives in 0.05–0.5 s (largest for xlsx). The biggest single part is
  **after Editor.bin: 1.5–2.4 s** of parse, font loading and layout/first render, and it grows with
  document size (docx 10 → 100 pages: +0.5 s).
- **The remote-apply tail is client-side, not the server.** The wire share (A send → B receive, including
  DocsCoServer) is 6–8 ms p50 and ≤ 20 ms max; A's change batching is ≤ 50 ms; the tail is B applying
  the change and recalculating (p90 105–143 ms, max 187 ms), larger on the big document. The 1–2.4 s
  p99 seen in PKT-0015 with 4 clients is therefore most likely CPU contention among Chromium instances.
- Not isolated: x2t time inside the open (it overlaps with script loading); images, real networks.

## Client: where the word editor's CPU goes (PKT-0043)

Scripts: `NODE_PATH=/opt/node-tools/node_modules node .theseus/oracle/perf/profile-word.js <file.docx> <out-dir> [runs]`
records CDP `Profiler` CPU profiles (100 µs sampling, headless Chromium from Playwright 1.63) of the editor tab;
`node .theseus/oracle/perf/attribute-word.js <out-dir> [--json]` attributes them. Aggregated output for both files in
`perf/word-profile-2026-11-02.json` (raw `.cpuprofile` files are not committed: 1–3 MB each, regenerate).
**Native package** 9.3.7-1, same VM and samples as PKT-0016 (docx 10 p / 100 p, text + tables, no images), 3 runs each.
- *open*: samples between CDP `Network.loadingFinished` of Editor.bin and `isDocumentLoadComplete` (same clock).
- *type*: user A types 40 characters one by one (A's profile). *apply*: A types 30 markers; profile of user B.
- Frames are named: `sdkjs/word/sdk-all.js` ships with names (whitespace-only minification); its frames are mapped
  to source files through definition anchors (names from the files `configs/word.json` bundles, looked up in
  `external/sdkjs`). `sdk-all-min.js` (the "min" base: docscoapi, CollaborativeEditingBase, SerializeCommonWordExcel,
  libfont loader…) is name-mangled and stays one bucket. Samples under Playwright's own `evaluate`/`predicate`
  frames (the harness polling `GetText`) are excluded (2–690 ms per run).
- Profiling inflates the open window (2.5–6.9 s here vs 1.9–2.4 s unprofiled in PKT-0016): read shares, not ms.

Self share of busy main-thread time, % (inclusive % in brackets = bucket anywhere on the stack), mean of 3 runs:

| Bucket | open 10 p | open 100 p | type 10 p | type 100 p | apply 10 p | apply 100 p |
|---|---|---|---|---|---|---|
| busy ms per run | 3 538 | 3 424 | 3 572 | 2 581 | 5 366 | 2 879 |
| word: paragraph/run layout & model (Paragraph*, Run, Paragraph/ draw states, bidi) | 18.7 (45) | 23.1 (43) | 23.5 (45) | 25.1 (46) | 19.4 (44) | 31.0 (49) |
| word: document recalc & pagination (Document*, DocumentContent*, sections, Layout) | 6.5 (50) | 4.3 (39) | 2.7 (53) | 2.9 (54) | 2.1 (57) | 5.0 (63) |
| word: table layout & model | 1.7 (6) | 2.6 (10) | 1.1 (8) | 1.0 (7) | 0.9 (5) | 1.2 (6) |
| word: styles & numbering | 5.1 (8) | 5.5 (11) | 0.4 | 0.5 | 3.0 (5) | 2.2 (3) |
| word: Serialize2 reader (Editor.bin) | 2.7 (13) | 4.8 (23) | 0 | 0 | 0 | 0 |
| collab: changes, history, apply (sdk-all.js part) | 0.5 (1) | 0.5 (1) | 0.3 | 0.6 | 0.1 | 0.1 |
| drawing & render (word/Drawing, common/Drawings) | 5.7 (21) | 6.1 (23) | 4.3 (57) | 3.7 (50) | 5.2 (49) | 2.2 (45) |
| fonts (common/libfont, fonts.wasm) | 15.5 (19) | 9.1 (22) | 5.5 (17) | 3.6 (16) | 8.1 (17) | 5.2 (14) |
| sdkjs/common: other | 2.6 | 2.9 | 1.8 | 1.3 | 1.0 | 0.5 |
| sdkjs base bundle sdk-all-min.js (mangled) | 4.8 (69) | 4.6 (63) | 1.8 (20) | 1.8 (16) | 1.6 (29) | 1.9 (28) |
| web-apps & vendor UI (app.js, jQuery) | 13.9 | 12.2 | 4.7 | 4.4 | 5.4 | 4.6 |
| browser: native builtins (canvas `drawImage` 21–27 % in type/apply) | 2.2 | 1.6 | 30.5 | 28.8 | 25.3 | 20.7 |
| browser: (program) = Blink style/layout/paint, V8 outside JS | 14.2 | 14.4 | 20.3 | 21.5 | 23.7 | 23.0 |
| browser: GC | 3.7 | 5.3 | 2.5 | 3.9 | 2.5 | 1.4 |
| *[stack] any sdkjs `*Recalc*` function* | (28) | (18) | (13) | (16) | (16) | (23) |
| *[stack] any sdkjs `*Draw*`/`*Paint*` function* | (14) | (14) | (54) | (48) | (45) | (33) |

Top self functions: open — `SetFontInternal` (textmeasurer), `hb_get_script_horizontal_direction`,
`CDocument.private_UpdateTracks`, `Paragraph.Get_PosByElement`, Styles (`CDocumentColor`, table-style creation),
`AscCommon.Hex.encode`; type/apply — `drawImage`, `ParaRun.Draw_HighLights` (2–4 %), `BidiFlow.add` (2–4 %),
`*.Document_Get_AllFontNames` (apply 100 p: 9 % self across Paragraph/Document/CTextPr, walks the whole
document per change), `ParaRun.Recalculate_Range`/`Recalculate_LineMetrics`, `CUniFill.createDuplicate`.

Reading:
- **Open after Editor.bin is mostly word layout, not parsing.** Serialize2 reading is 13–23 % inclusive (grows with
  size); paragraph/run + document recalc (≈ 40–50 % inclusive) and fonts (≈ 20 %, text measuring/shaping in
  fonts.wasm) dominate. web-apps UI start-up is ≈ 12–14 % self in the same window. Styles ≈ 5 % self.
- **Typing and remote apply are dominated by repainting, not by the change itself.** The collab apply code proper is
  < 1 % (the part in sdk-all-min.js is mangled but its whole stack share is ≤ 29 % including the recalc it calls);
  `*Draw*` on the stack is 33–57 %, canvas `drawImage` alone 17–27 % self and Blink `(program)` ≈ 21–24 %. In headless
  Chromium the canvas is software-rasterised, so drawImage is likely over-weighted here versus a GPU desktop.
- **Pure-JS kernels with a migration profile:** none dominates. The largest single sdkjs functions are 2–4 % each
  (`Draw_HighLights`, `BidiFlow.add`, font-name collection); text shaping already runs in WASM (fonts.wasm). Refactor
  candidates for wave 1: per-change `Document_Get_AllFontNames` walk, highlight/bidi draw passes, repaint scope on
  remote changes, styles construction at open.
- Not measured: GPU-backed rendering, images/drawings-heavy documents, the mangled base bundle's internals.

## Client: sdkjs/common share of open and remote apply, font waterfall (PKT-0045)

Script: `node .theseus/oracle/perf/profile-client.js <dir> external/sdkjs [runs]`; raw output in
`perf/client-profile-2026-11-02.json` (per open: attribution, font waterfall, client log). **Native package** 9.3.7-1,
PKT-0016 samples, 3 cold opens per file, Chromium CPU profile over CDP at 200 µs, same 2-CPU VM for server and
browsers (another packet may have been measuring at the same time: run-to-run spread is up to 2×; medians below).
Window = Editor.bin received → `isDocumentLoadComplete`. The profiler adds load: windows are 10–25 % longer than PKT-0016.
Attribution: the installed `sdk-all.js`/`sdk-all-min.js` are uglified with names kept and no source map; the script maps
each frame back to its source file by unique `function Name(` anchors from `configs/<editor>.json` (393/357/345 + 42/38/37
files, 85–95 % anchored). **Self** time, ms, median of 3; "common" = every `common/*` file plus the fonts WASM.

| Phase | Window | Busy | common (all) | fonts (libfont, GlobalLoaders) + WASM | drawings | charts | serialize | coauth (History, TableId, CoApi) | common other | editor (word/cell/slide) | web-apps | browser (program, GC, native) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| open docx 10 p | 4 525 | 3 141 | **720 (23 %)** | 200 + 102 | 88 | 4 | 44 | 7 | 278 | 1 141 | 463 | 695 |
| open docx 100 p | 3 319 | 2 723 | **586 (22 %)** | 206 + 79 | 86 | 3 | 60 | 17 | 120 | 1 095 | 339 | 665 |
| open xlsx 10 k | 2 659 | 2 285 | **503 (22 %)** | 180 + 78 | 55 | 8 | 68 | 3 | 106 | 919 | 352 | 414 |
| open pptx 50 | 2 531 | 2 278 | **794 (35 %)** | 170 + 79 | 296 | 4 | 110 | 12 | 137 | 690 | 229 | 524 |
| apply docx 10 p (24 changes) | 24 × 300 | 2 162 | **109 (5 %)** | 35 + 7 | 27 | 0 | 4 | 22 | 14 | 863 | 134 | 1 055 |
| apply docx 100 p (24 changes) | 24 × 300 | 1 424 | **79 (6 %)** | 20 + 6 | 27 | 0 | 0 | 13 | 13 | 625 | 77 | 644 |
| apply xlsx 10 k (20 changes) | 20 × 300 | 2 024 | **442 (22 %)** | 226 + 110 | 19 | 10 | 0 | 6 | 71 | 491 | 326 | 744 |

Apply = receiver B's samples in the 300 ms after each incoming `saveChanges` WebSocket frame (CDP timestamps, same clock as
the profile); every edit arrived (24 frames for 20 docx markers, 20 for xlsx). Busy per change: 59–101 ms, half of it browser
(paint, GC) and the editor's recalculation (`Run.js`, `Paragraph.js`, `highlight-draw-state.js`; `WorksheetView.js`, `StringRender.js`).

**Font waterfall** (ms after Editor.bin received, per run; `fonts` in the JSON has every file):

| File | Font files | Max in flight | First font requested → last received | TTFB first / last font | Last font → fonts done (poll tail) | 50 ms polls | onLoadFonts (client log) |
|---|---|---|---|---|---|---|---|
| docx 10 p | 25 | 25 | 709 / 1 591 / 1 403 | 48–79 / 515–1 387 | 30 / 71 / 48 | 13 / 30 / 27 | 736 / 1 649 / 1 447 |
| docx 100 p | 25 | 25 | 720 / 701 / 761 | 38–65 / 622–706 | 12 / 42 / 29 | 11 / 12 / 14 | 721 / 719 / 777 |
| xlsx 10 k | 14 | 14 | 455 / 468 / 305 | 44–103 / 264–422 | 33 / 49 / 50 | 9 / 4 / 6 | 471 / 493 / 347 |
| pptx 50 | 23 | 23 | 697 / 469 / 486 | 38–76 / 444–624 | 44 / 9 / 49 | 11 / 8 / 9 | 676 / 462 / 513 |

Reading:
- **The fonts are not fetched serially.** `CheckFontsNeedLoadingLoad` requests every font of the document at once (max in
  flight = all of them), and all are served through the editor's service worker (`fromServiceWorker`; cold context, so the
  worker fetches from nginx and fills its cache; byte counts are hidden, hence `kb: 0`). The 50 ms `check_loaded_list` poll
  only adds the tail between the last font and "fonts done": **6–71 ms**, ~40 ms median. The spread is the response time
  of the last font (0.3–1.4 s TTFB), i.e. queuing below sdkjs (service worker, connections, a CPU shared with the server).
  The DIAG-sdkjs-common Wave 1 candidate "parallel font fetching" has no target; replacing the poll with an event saves
  at most ~50 ms per open.
- **While fonts download the main thread is not idle**: of the LoadDocumentFonts → onLoadFonts window (0.5–1.5 s) it is
  busy 35–80 %, mostly browser work and web-apps UI init, with 50–125 ms in common and nothing in the editor (the document
  waits for the fonts). Faster fonts would shorten the open only if that work moves too.
- **common is 22–35 % of open CPU** (0.5–0.8 s); the largest parts are fonts (CPU, not I/O: 250–300 ms of
  libfont `file.js`/`map.js`/`textshaper.js` + WASM, i.e. measuring and shaping glyphs) and, for pptx, drawings (~300 ms,
  `Drawings/Format/*`). Charts and coauth are negligible on these samples (no charts in them); serialize is 44–110 ms.
  The editor itself (`Styles.js`, `Paragraph.js`, `Run.js`, `Serialize2.js`) is the larger share (0.7–1.1 s).
- **Remote apply barely touches common in Word (5–6 %)**; History/TableId/CoApi cost 13–22 ms for 24 changes. In the
  spreadsheet common is 22 %, almost all text measurement (libfont + WASM, 336 ms for 20 changes) during re-render.
- Not covered: documents with images or charts (samples have none), the visio/pdf editors, inclusive time as a headline
  (it is in the JSON, but callbacks inflate it: the font loader's end callback runs the rest of the open).

## Client: drawings group by function on open (PKT-0073)

Script: `node .theseus/oracle/perf/drawings-functions.js <dir> external/sdkjs [runs]` (reuses the helpers of
`profile-client.js`, same window, sampling and file mapping); raw output in `perf/drawings-functions-2026-11-02.json`.
**Native package** 9.3.7-1, PKT-0045 samples, 3 cold opens each, same 2-CPU VM. Medians, ms.
File names come from nearest-anchor mapping and can be off by one file (e.g. `CShape.getIsSingleBody` shows under
`CnxShape.js`); **function names are exact** (the bundle keeps them).

Drawings self time per open: pptx 50 **282-290**, docx 10 p 51-70, docx 100 p 66-96, xlsx 10 k 31-51 (matches PKT-0045).

pptx 50, largest **self** time by function (no function exceeds 31 ms; the top 40 sum to 152 ms, the other ~130 ms is a
long tail of functions under 2 ms each):

| Function | Self | Note |
|---|---|---|
| `CShape.recalculateTextStyles` inner closure (Shape.js) | 15 | builds a `CStyles` per shape |
| `xhr.onload`, `CFontFileLoader.LoadFontArrayBuffer`, `LoadFont` (Drawings/Externals.js) | 29 | **font loading, mis-grouped as drawings**; in docx/xlsx it is most of "drawings" |
| `ExecuteNoHistory` (Format.js) | 13 | wrapper; its callees are the recalculation |
| `CShape.getPlaceholderType`, `isPlaceholder`, `getUniNvProps`, `getHierarchy`, `getIsSingleBody` | 24 | placeholder hierarchy walks, repeated per shape |
| DrawingsChanges.js module init | 8 | one-off |
| `CMemory.sha256` (Metafile.js) | 6 | called from `word/Editor/Styles/style-cache.js` |
| `CUniColor.createDuplicate`, `CUniColor`, `CSolidFill`, `CUniColor.check` | 10 | colour copies |
| `Geometry.Recalculate`, `CShape.recalculateTransform*`, `recalculateBounds`, `draw` | 12 | geometry and draw |

**Inclusive** (any group below; this is where a refactor would pay): `CShape.recalculate` 601 →
`CShape.recalculateDocContent` 504 (word text layout inside shapes: editor work, not Format code) ;
`CShape.Get_Styles` / `recalculateTextStyles` **143**, of which `CMemory.sha256` **91** (style-cache key hashing);
`CShape.draw` / `drawTxBody` 106 (thumbnails and first paint); `CShape.getHierarchy` 34; `CTextBody.checkContentFit` 35.
Callers into drawings (self ms): `CDocumentContent.GetStyles` 48, `SlideLayout.recalculate` 27, `Slide.recalculateSpTree` 26,
`MasterSlide.recalculate` 14, font loader 15+9.

Reading:
- **No single Drawings/Format function exceeds 50 ms of self time.** The ~290 ms is a flat profile: ~30 ms is font
  loading (Externals.js; PKT-0045's grouping counts it as drawings), the rest is spread over hundreds of small functions.
- **One refactor candidate exceeds 50 ms inclusive:** per-shape text-style construction (`recalculateTextStyles`,
  143 ms) and its sha256 style-cache key (91 ms). Expected gain 50-100 ms per 50-slide open (requested as a refactor
  packet; needs the sdkjs fork). Placeholder hierarchy walks (~24 ms self, 34 ms inclusive `getHierarchy`) are below the bar.
- Text layout inside shapes (`recalculateDocContent`, ~500 ms inclusive) is the word engine on behalf of slide:
  it belongs to the sdkjs-slide / sdkjs-word diagnoses, not to common.
- Grouping fix for later reports: `common/Drawings/Externals.js` should count as fonts.

## End-to-end server (full stack, PKT-0015)

Environment: `ghcr.io/euro-office/documentserver:latest` (DocService 9.3.7 build 37, PostgreSQL, Redis,
RabbitMQ, FileConverter/x2t in one container), cloud VM with 2 CPUs and 7 GB RAM, measured 2026-11-02.
Absolute numbers are a lower bound for production hardware; the proportions are the point.
Samples: the image's own `en-US/new.{docx,xlsx,pptx,pdf}` templates (6–35 kB, copied from the container at run time, see the header of `perf/e2e-convert.js`).
**Small, near-empty documents only**: these numbers are fixed per-request costs, not content costs.

Runtime configuration needed (container `local.json`, not source code):
`services.CoAuthoring.request-filtering-agent.allowPrivateIPAddress: true`, otherwise every download from a
private address (the bench file server, the example's own callback) fails with ConvertService `error: -4`.
The editors must be opened through the container's bridge IP (port 80), not `127.0.0.1:8080`: the example
builds the save-callback URLs from the browser's host, so through `:8080` the save fails with `ECONNREFUSED`.

### ConvertService (`perf/e2e-convert.js`, 20 conversions per pair, async mode polled every 50 ms)

| Conversion | p50 (1 client) | p99 (1 client) | throughput 1 client | p50 (4 parallel) | p99 (4 parallel) | throughput 4 parallel | raw x2t p50 (loop below) |
|---|---|---|---|---|---|---|---|
| docx → pdf | 767 ms | 873 ms | 1.3 /s | 1 880 ms | 2 253 ms | 1.85 /s | 647 ms |
| docx → odt | 138 ms | 163 ms | 7.3 /s | 238 ms | 324 ms | 14.2 /s | 80 ms |
| xlsx → pdf | 758 ms | 995 ms | 1.3 /s | 1 711 ms | 2 141 ms | 2.1 /s | 723 ms |
| xlsx → ods | 137 ms | 158 ms | 7.3 /s | 243 ms | 422 ms | 13.5 /s | 67 ms |
| pptx → pdf | 1 169 ms | 1 350 ms | 0.9 /s | 2 899 ms | 3 803 ms | 1.2 /s | 1 013 ms |
| pptx → odp | 175 ms | 210 ms | 5.9 /s | 258 ms | 323 ms | 12.9 /s | 81 ms |
| pdf → docx | 136 ms | 148 ms | 7.3 /s | 195 ms | 261 ms | 15.6 /s | 66 ms |

(p99 over 20 samples = the maximum; 0 errors in 280 conversions. Download of the result adds ≈ 1 ms.)

Raw x2t (no DocService/RabbitMQ), 5 runs per pair, inside the container:

```sh
docker exec eo sh -c 'cd /var/www/euro-office/documentserver/server/FileConverter/bin; T=/var/www/euro-office/documentserver/document-templates/new/en-US
for p in docx:pdf docx:odt xlsx:pdf xlsx:ods pptx:pdf pptx:odp pdf:docx; do f=${p%:*}; t=${p#*:}; all=""
 for i in 1 2 3 4 5; do s=$(date +%s%N); ./x2t $T/new.$f /tmp/o.$t >/dev/null 2>&1; all="$all $(( ($(date +%s%N)-s)/1000000 ))"; done
 echo "$f->$t ms:$all"; done'
```

Reading:
- **x2t is the cost.** Service overhead (HTTP, Redis/PostgreSQL task row, RabbitMQ round trip, storage, and up to
  50 ms of our own polling) is ≈ 55–95 ms per conversion; x2t is 70–90 % of every PDF conversion.
- **Anything → PDF costs ~0.6–1 s even for an empty document** (pdf rendering path through DoctRenderer/sdkjs),
  against ~70 ms for the ODF formats: an order of magnitude, worth a look in `core`.
- **Throughput is CPU-bound**: 4 parallel requests only give 1.4× (PDF) to 2× (ODF) on 2 CPUs, and latency
  rises accordingly — no queueing pathology visible, the converter simply saturates the cores.
- **Sync mode (`async: false`) answers in whole seconds** (1 012 ms, 2 016 ms…): DocService polls the task
  status every ~1 s internally, so a 140 ms conversion is reported to sync callers after ≥ 1 s. Integrations
  that call ConvertService synchronously pay up to +900 ms per request. Cause: `CONVERT_ASYNC_DELAY = 1000` with `utils.sleep`
  in `DocService/sources/converterservice.js:49,163`. Candidate improvement (not touched here, no spawn filed
  to stay within the file budget; see the packet log).

### Upstream defect / crash rate (PKT-0017)

Script: `node .theseus/oracle/perf/defect-history.js git <bare.git> <name>` (fix/crash commits) and
`node .theseus/oracle/perf/defect-history.js issues` (issue counts). Sources, 2026-11-02:
blob-less `git clone --bare` of github.com/Euro-Office/server (default branch `main`) and ONLYOFFICE/server;
issue counts from the GitHub **search** API (`/search/issues`; the per-repo API and `gh api` are blocked
in the factory). ONLYOFFICE/server has issues disabled: its issues are in ONLYOFFICE/DocumentServer, which
covers the **whole product** (editors, converter, server), so it is an upper bound for the server.

Rules (quoted from the script): fix = subject matches
`/\b(fix(e[sd])?|fixing|bugfix|hotfix|bug\s*#?\d+|regression)\b/i`; crash = subject contains `crash`, or
fix and `/\b(crash\w*|segfault|unhandled|uncaught|oom|out of memory|hang\w*|deadlock|exit code|process exit|restart\w*)\b/i`.
Merges excluded; commits with the same date + subject counted once (Euro-Office `main` has **1 828 duplicates**
from a rebase of the upstream history: without dedup the counts nearly double). Issue crash = text matches
`crash OR crashes OR hang OR "out of memory"`.

**Fix commits per year** (Euro-Office `main` = ONLYOFFICE history up to the fork + Euro-Office work)

| year | EO commits | EO fix | EO fix % | EO crash | OO commits | OO fix | OO fix % | OO crash |
|---|---|---|---|---|---|---|---|---|
| 2013–2017 | 893 | 52 | 6 | 1 | 885 | 52 | 6 | 1 |
| 2018 | 129 | 29 | 22 | 1 | 127 | 29 | 23 | 1 |
| 2019 | 107 | 30 | 28 | 0 | 104 | 29 | 28 | 0 |
| 2020 | 207 | 102 | 49 | 0 | 199 | 97 | 49 | 0 |
| 2021 | 152 | 65 | 43 | 1 | 148 | 64 | 43 | 1 |
| 2022 | 150 | 60 | 40 | 5 | 145 | 55 | 38 | 5 |
| 2023 | 194 | 83 | 43 | 4 | 176 | 76 | 43 | 4 |
| 2024 | 224 | 123 | 55 | 5 | 211 | 119 | 56 | 5 |
| 2025 | 402 | 218 | 54 | 4 | 287 | 139 | 48 | 4 |
| 2026 (to 10-28 / 10-15) | 84 | 32 | 38 | 0 | 212 | 119 | 56 | 2 |
| **total** | 2 542 | 794 | 31 | 21 | 2 494 | 779 | 31 | 23 |

Euro-Office per month, last 12 with commits: 2025-11 6/13 fix, 12 4/9, 2026-01 5/11, 02 5/17, 03 1/9,
05 5/8, 06 4/10, 08 0/1, 09 0/1, 10 12/27; crash-related 1 each in 2025-11 and 2025-12, none since.
The low fix share before 2018 reflects commit-message habits (no `[bug]`/`Fix bug N` convention), not quality.

**Bug and crash issues**

| Tracker | Period | Issues | Bug-labelled | Crash/hang |
|---|---|---|---|---|
| ONLYOFFICE/DocumentServer (whole product), label `confirmed-bug` | 2022 / 2023 / 2024 / 2025 / 2026 | 426 / 391 / 478 / 432 / 293 | 163 / 151 / 200 / 202 / 147 (38→50 %) | 15 / 13 / 6 / 12 / 19 |
| Euro-Office/server, label `bug` | 2026-01 … 2026-11 (first issue 2026-01-07) | 14 | 4 (Jan 1, Jun 1, Aug 2) | 2 (Aug) |
| Euro-Office/DocumentServer (product), label `bug` | 2026-02 … 2026-11 | 276 (peak Jun: 86) | 61 (Jun 20, Aug 15, Sep 8) | 27 |

Full yearly (2016–2026) and monthly tables: run the script; they are not repeated here.

**Where fixes concentrate** (Euro-Office `main`, fix commits / all commits touching the file):

| File / module | fix | commits | crash |
|---|---|---|---|
| `DocService/` (module) | 421 | 1 115 | 13 |
| `Common/` (module) | 259 | 904 | 4 |
| `FileConverter/` (module) | 71 | 259 | 5 |
| `DocService/sources/DocsCoServer.js` | 197 | 562 | 7 |
| `DocService/sources/canvasservice.js` | 131 | 318 | 5 |
| `Common/config/default.json` | 79 | 322 | 1 |
| `Common/sources/utils.js` | 66 | 203 | 2 |
| `DocService/sources/wopiClient.js` | 64 | 130 | 1 |
| `FileConverter/sources/converter.js` | 61 | 217 | 5 |
| `DocService/sources/server.js` | 35 | 178 | 3 |

Crash fixes (21 on EO `main`) are almost all **null/undefined guards and unhandled errors in Node**
(undefined user name, permissions, tenant, connection; forcesave after close; socket error on client disconnect
2025-12; `getJwtHsKey` 2025-11), clustered in `DocsCoServer.js`, `canvasservice.js` and `converter.js`.

Reading:
- About **half of all server commits since 2020 are fixes** (40–56 % per year); about **4–5 crash fixes a
  year**, concentrated in the same three files that dominate fixes overall. `DocsCoServer.js` (4.7 k lines,
  the structural hotspot below) gets a quarter of all fix commits.
- **Finding:** two 2026 ONLYOFFICE crash/hang fixes are **not on Euro-Office `main`**: "Handle client
  disconnect during file streaming to prevent process crash; Fix bug 81132" (2026-04-16; present only on
  Euro-Office side branches such as `release/v9.4.0`) and "Release SaveVersion after a failed final assembly
  so prepare4shutdown no longer hangs; Fix bug 81576" (2026-07-13; absent from every Euro-Office ref, by bug
  number). Whether to port them is a decision for the humans.
- No production crash telemetry exists; these are **fixed** defects, a proxy for the defect rate, not the
  crash rate users see.

### Open, co-edit round trip, save (`perf/e2e-coedit.js`, headless Chromium through the example)

| Operation | What is timed | 2 clients p50 | 2 clients p99 | 4 clients p50 | 4 clients p99 |
|---|---|---|---|---|---|
| Open (first user, new docx) | `goto` → editor load complete (includes x2t docx→internal) | 2.78 s | 2.96 s | 2.72 s | 2.75 s |
| Join (other users, same doc) | `goto` → load complete | 2.83 s | 3.37 s | 3.14 s | 3.33 s |
| Co-edit round trip | A types a marker → present in every other client's model | 99 ms | 1 110 ms | 105 ms | 2 442 ms |
| Save after close | last client closes → saved file in the example storage (callback status 2) | 5.89 s | 6.04 s | 6.22 s | 6.35 s |

Samples: 2 clients 5 runs × 20 edits (100 round trips); 4 clients 3 runs × 20 edits × 3 receivers (180).
Edits are sequential (one marker, wait for all receivers, 300 ms pause), so this is latency, not a load test.

Reading:
- **Round trip p50 ≈ 0.1 s, unchanged from 2 to 4 clients**; the server's per-message cost (≈ 60 µs, micro-benchmarks
  above) is < 0.1 % of it. The **tail grows with clients** (p99 1.1 s → 2.4 s). With 4 Chromium instances
  on 2 CPUs the receivers are CPU-starved, so the tail is probably client/host contention and the sdkjs
  change-batching interval, not DocsCoServer — but this run does not prove it; it needs a server-side
  timestamp per message (receive → broadcast) to split.
- **Save ≈ 6 s is almost all configured delay**: `services.CoAuthoring.server.savetimeoutdelay` = 5 000 ms after
  the last user leaves, then ≈ 0.9–1.3 s of assembling changes (x2t) + callback + example download.
- **Open ≈ 2.8 s is the client** (bundles, fonts, render); the server part (x2t docx → internal format ≈ 80 ms
  raw, by analogy with the ODF rows) is a few percent.

### Co-edit tail split, load test, large files (PKT-0018, native package 9.3.7-1, 2-CPU VM)

Raw numbers: `perf/results-2026-11-02.json`. Scripts: `perf/coedit-split.js`, `perf/load-coedit.js`, `perf/convert-large.js`.
Server-side timestamps come from DocService DEBUG logs (log4js level DEBUG, config only, no source change).

**Co-edit round trip split** (`coedit-split.js`, headless Chromium, new docx, ms):

| Segment | 2 clients p50 / p99 | 4 clients p50 / p99 |
|---|---|---|
| total (type → marker in receiver model) | 101 / 294 | 126 / 2 066 |
| type (sender keystroke → WebSocket send) | 46 / 120 | 48 / 1 843 |
| up (send → DocService receive) | 1 / 21 | 1 / 22 |
| **server (receive → broadcast)** | **4 / 69** | **4 / 57** |
| down (broadcast → receiver WebSocket event) | 1 / 198 | 1 / 924 |
| apply (receiver event → marker in model) | 47 / 165 | 58 / 169 |

Host CPU was ≈ 99 % busy throughout; Chromium took 46–76 % of CPU time, DocService 3–7 %.
**Verdict: the tail is the clients, not DocsCoServer.** The server segment stays ≤ 70 ms p99 and does not grow
with clients; the 4-client tail is in the sender's main thread (sdkjs batching/CPU) and the receiver being
scheduled (`down`), i.e. CPU starvation of the browsers on 2 CPUs. 17/60 (2 clients) edits were sent in
more than one batch.

**Load test** (`load-coedit.js`, raw Socket.IO clients, 2 changes/s per document, 30 s, ms):

| Docs × clients | changes/s | broadcasts/s | ack p50 / p99 / max | broadcast p50 / p99 / max | open p99 | DocService cores |
|---|---|---|---|---|---|---|
| 1 × 2 | 2 | 2 | 4 / 15 / 15 | 4 / 15 / 15 | 1 031 (cold) | 0.02 |
| 10 × 5 | 20 | 79 | 3 / 7 / 10 | 3 / 7 / 10 | 131 | 0.04 |
| 50 × 5 | 98 | 393 | 3 / 12 / 41 | 3 / 12 / 41 | 160 | 0.13 |
| 100 × 10 (port 8000, no nginx) | 197 | 1 771 | 3 / 12 / 32 | 2 / 11 / 32 | 149 | 0.28 |
| 200 × 5 (port 8000, PKT-0021) | 393 | 1 574 | 4 / 28 / 109 | 4 / 27 / 109 | 177 | 0.40 |
| 200 × 10 (port 8000, PKT-0021) | 393 | 3 541 | 5 / 28 / 88 | 5 / 28 / 88 | 159 | 0.54 |

- Latency is flat up to 1 000 sockets and ≈ 1 800 broadcasts/s; DocService used 0.28 of a core, PostgreSQL 0.09.
- 100 × 10 **through nginx** failed with Socket.IO `TransportError`: stock `worker_connections 768` caps the
  proxy at ≈ 700 sockets. A deployment config limit, not a server limit.
- 200 × 5 first hung (PKT-0018); PKT-0021 found **a harness bug, not a server limit**: when a 2nd editor joins,
  DocsCoServer takes an auth lock with a timer (`expire.lockDoc` = 30 s, `setLockDocumentTimer`); the real editor
  releases it with `unLockDocument`, the script did not. Docs are opened one after another, so once the open phase
  passed 30 s the lock holders were dropped and the untimed `saveLock` wait hung. `load-coedit.js` now sends
  `unLockDocument` from the first client after each doc opens and times out `saveLock` waits (10 s, `noLockReply`).
- After the fix (PKT-0021, 2 changes/s/doc, medium-10p.docx): 200 × 5 and 200 × 10 run with no errors and no lost
  broadcasts; PostgreSQL 0.25 core. No ceiling at 2 000 sockets / 3 500 broadcasts/s; p99 rises 12 → 28 ms with the
  doubled change rate. Not pushed higher: the load generator shares the 2 CPUs.
- Save after all clients leave: every save returned callback status 3 (the replayed change does not fit the
  document, so assembly fails); the time `saveAllMs` (6 s for 1 doc, 67 s for 100) is therefore indicative only. Superseded by the valid-save measurement below (PKT-0023).

**Valid saves under load** (PKT-0023, `load-coedit.js replay <docs>`, native 9.3.7-1, 2-CPU VM). Per document: a fresh key
on a pristine copy of the en-US blank template, 1 client, the full change sequence captured from a browser typing
"hello world" (`load-coedit.js capture`; 17 changes in one `saveChanges`), then all sockets close at once.
Assembly = socket close → callback (includes `savetimeoutdelay` 5 s). All docs opened concurrently. ms:

| Docs | callback status | assembly p50 / p90 / max | ack p50 / max | open p50 / p99 |
|---|---|---|---|---|
| 1 | 2 ×1 | 5 719 | 4 / 4 | 126 |
| 10 | 2 ×10 | 7 837 / 9 581 / 9 581 | 10 / 11 | 449 / 608 |
| 50 | 2 ×50 | 16 590 / 25 612 / 27 526 | 38 / 56 | 1 531 / 2 608 |
| 100 | 2 ×100 | 27 998 / 45 544 / 49 282 | 63 / 77 | 2 727 / 5 226 |
| 200 | 2 ×200 | 51 806 / 87 489 / 95 035 | 122 / 165 | 6 283 / 11 538 |

- **Every save is valid** (status 2, 0 lost, 0 lock errors). Why PKT-0021's single change failed: the browser's
  first batch starts with a `64;` change (document/application info) before the first `35;` (add text into run
  `672`); replaying the `35;` alone is what x2t rejected. A second cause, found on the way: the base must be the
  untouched template. The capture's own file is overwritten by the browser's save when it closes, and replaying onto it
  fails again with status 3 (first 1–200 sweep, all status 3, before switching the base).
- **Save assembly is serial**: the last save lands ≈ 5 s + 0.45 s × docs (95 s for 200). That is what
  FileConverter `maxprocesscount` = 1 predicts (one x2t at a time, one RabbitMQ queue shared with conversions). So the
  save backlog after a mass disconnect, not DocService, is the bottleneck: 200 editors leaving together wait up to
  1.5 min for their file. Raising `maxprocesscount` (or more converters) is the lever; not measured here.
- `coresUsed` stays ≈ 0 for all processes: the sampler reads only live processes' own CPU, and the short-lived x2t
  children are not counted. CPU of save assembly is therefore not in these numbers.
- Opens here are concurrent (the co-edit mode opens sequentially), hence open p99 of 11.5 s at 200: the x2t open
  conversions queue on the same single converter.
- Small documents only (blank docx + 11 characters); per-save x2t time grows with document size (see Large files).

**Large files** (`convert-large.js`, PKT-0016 samples, 3 runs, concurrency 1, ms p50):

| File | raw x2t open (→ Editor.bin) | raw → pdf | service → pdf | service → ODF | service → own format (save path) |
|---|---|---|---|---|---|
| medium-10p.docx (40 kB) | 107 | 1 340 | 1 454 | 198 | 128 |
| large-100p.docx (77 kB) | 104 | 3 545 | 3 894 | 268 | 145 |
| large-10k.xlsx (421 kB) | 299 | 6 518 | 6 417 | 3 121 | 213 |
| deck-50.pptx (74 kB) | 113 | 1 955 | 3 057 (max 124 316) | 202 | 136 |

- The open conversion stays ≈ 0.1–0.3 s even on large files: open time is the client, as PKT-0016 found.
- PDF export dominates (1.3–6.5 s, all x2t rendering; DocService overhead ≈ 0.1 s).
- The 124 s pptx → pdf (one in three runs) is explained (PKT-0021): queueing, not x2t. FileConverter
  `maxprocesscount` = 1 and conversions share one RabbitMQ queue with save assembly; this run followed the load test,
  whose 100 failing saves (with retries) were still queued, and deck-50.pptx → pdf were the first conversions. On an
  idle server 10 runs took 1 966–2 789 ms; started right after a 100 × 2 load test: 2 187, 2 386, then 68 662 ms.
  `convert-large.js` now waits for the queue to drain (small probe conversion < 3 s) before timing; run it on an idle
  server or before the load tests.

### Common's share of DocService CPU (PKT-0026, native 9.3.7-1 stack, 2-CPU VM)

Raw numbers: `perf/common-share-2026-11-02.json`. Scripts: `perf/profile-toggle.js` (windowed V8 profiler, started and
stopped with `SIGUSR2`), `perf/profile-common.js` (attribution). **DocService ran from this repository's source** with
Node 22 (`node --require profile-toggle.js sources/server.js`, same env and config as the `ds-docservice` unit): the
packaged `docservice` binary ignores `NODE_OPTIONS`, and `--cpu-prof` alone profiles startup and writes only on a clean
exit. Load numbers matched PKT-0018 (ack / broadcast p50 3 ms, p99 10–12 ms), so the source run is representative.
ConvertService was driven with `convert-large.js` on the en-US `new.*` templates (5 runs × 9 pairs, 45 conversions):
`e2e-convert.js` sends no JWT and the native install has JWT on. Two log levels: DEBUG (what this VM has been
left on since PKT-0018) and WARN (stock).

Self = leaf frame in `Common/sources`. Inclusive = a `Common/sources` frame anywhere on the stack (Common and what it
calls). "+ libs" also counts library code only Common uses (log4js, amqplib, config, aws-sdk…), whose async callbacks
run without a Common frame. Percentages are of DocService busy CPU; "of wall" is of the profiled window.

| Run | DocService cores | Common self | Common inclusive | Common + libs inclusive | Common inclusive, % of wall |
|---|---|---|---|---|---|
| co-edit 50 × 5, WARN | 0.077 | 4.0 % | 14.6 % | 17.3 % | 1.1 % |
| co-edit 50 × 5, DEBUG | 0.115 | 2.6 % | 12.2 % | 38.8 % | 1.4 % |
| ConvertService ×45, WARN | 0.043 | 3.5 % | 25.4 % | 26.8 % | 1.1 % |
| ConvertService ×45, DEBUG | 0.037 | 3.3 % | 29.3 % | 46.5 % | 1.1 % |

Where the inclusive Common time enters (WARN):
- Co-edit: `utils.postRequestPromise` 6.5 % (the save callbacks to the integrator, HTTP via axios),
  `utils.fillJwtForRequest` 1.9 %, `operationContext` (Context, getCfg, initFromConnection) ≈ 2.3 %,
  `storage-base` (getSignedUrls, listObjects → storage-fs) 1.5 %, `taskqueueRabbitMQ` 0.4 %, `logger` 0.5 %.
- ConvertService: `utils.fillResponse` 17.5 % (writing the HTTP response, mostly `writev`/socket: the client polls
  every 50 ms), `utils.checkClientIp` 3.6 %, `taskqueueRabbitMQ` 1.4 %, `tenantManager.getTenantSecret` 0.9 %,
  `operationContext` 0.7 %. ≈ 4.6 ms of Common CPU per conversion (18 ms DocService CPU per conversion in total,
  most of it the 50 ms polls), against 125–1 000 ms end to end: Common is < 4 % of a conversion's latency.

**Verdict.** Common's own code is 3–4 % of DocService CPU; with everything it calls, 15–25 %; in absolute terms
≈ 0.01 core and ≈ 1 % of wall time under the 50 × 5 load. Common is not a performance hotspot: the tenant config
lookups (`operationContext.getCfg`) are ≈ 1 %, storage-base < 2 %, the RabbitMQ task queue < 1.5 %. The one sizeable
Common-related cost is **logging at DEBUG**: it adds ≈ 50 % to DocService CPU under co-edit load (0.077 → 0.115 core;
log4js + console + date-format), all of it in the appenders, not in `Common/sources/logger.js`. These numbers support
DIAG-common's **keep** verdict: there is no performance case for reworking Common.
Note for later measurements: reset the log level to WARN (`/etc/euro-office/documentserver/log4js/production.json`)
or say which level was on.

### Document editor open window split by resource and CPU (PKT-0047)

Script: `node .theseus/oracle/perf/open-window.js <out.json> <file.docx>... [--runs 5] [--interval 1000] [--raw]`; median summary in
`perf/open-window-2026-11-02.json`. **Native package** 9.3.7-1, same VM (2 CPUs), PKT-0016 samples (docx 10 p / 100 p),
1 warm-up + 5 runs each, new browser context per open (cold HTTP cache). Marks, ms after `goto`:
**LoadDoc** = first call of `asc_docs_api.prototype.asc_LoadDocument` (wrapped by an init script);
**Bin** = CDP `requestWillBeSent` of Editor.bin; **Ready** = `isDocumentLoadComplete`. Resource times come from
unprofiled opens; CPU from paired opens with a CDP CPU profile (1 ms sampling; the profiler moves the marks by < 100 ms).

Marks, p50 (unprofiled / profiled): docx 10 p LoadDoc 1 422 / 1 368, Bin 1 524 / 1 481, Ready 3 844 / 4 394;
docx 100 p LoadDoc 1 414 / 1 348, Bin 1 478 / 1 464, Ready 4 422 / 4 439. Bin follows LoadDoc by 65–100 ms
(open request → DocService/x2t → Editor.bin URL), so **the pre-document window is ≈ 1.4 s and ends at LoadDoc**.

Resources (docx 10 p, p50; 100 p within ± 100 ms except Editor.bin size). Size = decoded body (CDP `dataLength`);
wire size is not available (Chromium reports `encodedDataLength` −1/0 for these responses, so PKT-0016's
"~500 KB" was a transferSize undercount, not the payload).

| Resource | n | Decoded KB | Requested → last finished (ms) | Before LoadDoc? |
|---|---|---|---|---|
| example host page + api.js | 2 | 33 | 3 → 1 193 | yes |
| web-apps index.html, api.js (frame), code.js | 4 | 414 | 27 → 3 850 | 3 of 4 |
| vendor: require.js, jQuery, xregexp, socket.io | 4 | 262 | 82 → 320 | yes |
| app.css | 1 | 560 | 115 → 133 | yes |
| **documenteditor app.js** (webpack: DE app + apps/common + Backbone etc.) | 1 | 2 447 | 126 → 255 | yes |
| **sdkjs word/sdk-all-min.js** (base, mangled) | 1 | 2 416 | 339 → 460 | yes |
| locale en.json + svg/plugins/themes json | 7 | 305 | 656 → 3 963 | 1 (en.json) |
| **sdkjs word/sdk-all.js** (word engine) | 1 | 18 115 | 799 → 1 820 | requested yes, **finished after** LoadDoc and Bin |
| apps/common separate files (alphabet letters) | 1 | 0.3 | 1 145 → 1 225 | yes |
| sdkjs other (AllFonts.js, fonts.js/wasm, spell, ChartStyles) | 24 | 5 848 | 81 → 3 091 | 5 of 24 |
| Editor.bin | 1 | 199 (100 p: 684) | 1 524 → 1 723 | no |
| font files | 25 | 16 286 | 2 369 → 3 125 | no |

CPU of the main thread from `goto` to LoadDoc, ms p50 (self time of the leaf frame's script; window ≈ 1 370 ms profiled):

| Bucket | docx 10 p | docx 100 p |
|---|---|---|
| idle (waiting on network) | 258 | 239 |
| browser (program): HTML/JS parse + compile, style, layout | 194 | 197 |
| browser native builtins + GC | 85 | 77 |
| vendor files (jQuery ≈ all of it, called by the UI build) | 444 | 407 |
| documenteditor app.js, `DE.*` modules | 184 | 167 |
| apps/common in app.js (`Common.*` modules: UI components, utils) | 125 | 166 |
| Backbone/underscore/webpack runtime in app.js | 22 | 35 |
| **sdkjs sdk-all-min.js** | 77 | 88 |
| sdkjs sdk-all.js (word engine) | 0 | 0 |
| locale / CSS | not JS: inside (program)/native; CSS is 560 KB parsed in (program) | same |

Controller launch (busy CPU before LoadDoc attributed to the nearest controller module on the stack, p50 ms; sum ≈ 665 of
≈ 1 110 busy ms in both files): **Toolbar 252 / 238** (`Main.onEditorPermissions → applyModeEditorElements →
Toolbar.onAppShowed → Views.Toolbar.render`, ≈ 500 ms inclusive in a single profile, mostly
`Common.Utils.injectComponent`, `getWidthOfCaption` and jQuery DOM work), **Comments 116 / 96** (≈ 90–100 ms inside its
`onLaunch`), **Main 80 / 105**, **Viewport 68 / 70**, LeftMenu 28 / 14, Statusbar 25 / 24, ReviewChanges 19 / 21,
HeaderFooterTab, Links, RightMenu, ViewTab 10–19 each, the other ~15 controllers ≤ 10 each. Inclusive `onLaunch` itself is
small except Comments (Viewport 19, LeftMenu 12–26, Main 9–13): the cost is the UI build after the license/permissions
message, not the launch hooks. Between LoadDoc and Bin (≈ 0.1 s) only ≈ 40 ms of parse/compile and ≈ 10 ms of sdkjs are added.

Reading:
- **Before the document is requested (≈ 1.4 s) the time is the web-apps UI, not sdkjs.** About 1.1 s of the window is
  busy; ≈ 0.95 s of it is web-apps (app.js DE + common + vendor/jQuery + parse) and ≈ 0.08 s is sdkjs
  (sdk-all-min.js). The word engine sdk-all.js (18 MB decoded) is downloaded in parallel and finishes *after*
  Editor.bin is requested; it costs nothing in this window (its parse lands in the "after Editor.bin" phase of PKT-0016/0043).
- **The toolbar build is the single biggest item (≈ 0.25 s self, ≈ 0.5 s inclusive).** Deferring the toolbar tabs that
  are not shown (Links, HeaderFooter, ViewTab, Review, Forms, Draw ≈ 70–90 ms) and Comments' launch (≈ 0.1 s) is the
  realistic gain (estimate, not measured): ≈ 0.3–0.4 s off ≈ 1.4 s, on a 2-CPU VM, and only if Editor.bin is ready that early (server open
  ≈ 65–100 ms after LoadDoc here). Lazy-loading the ~30 controllers *as code* would save little: module evaluation
  (`__webpack_require__` + Backbone) is < 0.1 s.
- **A refactor here is worth less than the post-Editor.bin phase** (2.3–2.9 s: sdk-all.js parse, fonts, layout).

## Quality: what can be measured here today

Script: `sh .theseus/oracle/perf/quality.sh` (from the repository root).

- **Unit oracle** (`.theseus/oracle/unit.sh`): not run in this packet, the executor's permissions refused it
  (see the packet log). The factory runs it as `integrate_check`; its last result is the reference.
- **Defect history**: git history here starts on 2026-10-28 (89 commits, restart from upstream). Only 3
  commits in it match `fix|bug|crash|regress`, all touching tests/tooling. Not usable; the upstream rate is
  in "Upstream defect / crash rate" above (PKT-0017).
- **Structural risk** (what makes defects likely), from size alone: `DocsCoServer.js` 4 736 lines,
  `canvasservice.js` 2 106, `utils.js` 1 563, `wopiClient.js` 1 250, `commondefines.js` 1 245. Co-edit
  coordination concentrated in one 4.7 k-line file is the main structural hotspot.

## Gaps (not measured, and why)

| Gap | Why | Follow-up |
|---|---|---|
| Load beyond 2 000 sockets; save assembly with more converters or larger documents | valid saves measured to 200 docs (PKT-0023, above): serial at ≈ 0.45 s/doc with `maxprocesscount` 1; not measured with more converter processes, on large documents, or with x2t CPU counted | new packet if the save backlog matters |
| Client latency: x2t share of open, real network, low-end clients | PKT-0016 split open and remote apply (section above), but the server's open + x2t is not isolated from the client's lazy script loads, all timings are on localhost, and 2 CPUs host server and browsers | server-side timestamps per open (DocService log: open request → Editor.bin ready) |
| x2t conversion time per format | measured on realistic files in PKT-0018 (above) | — |
| Crash rate seen by users | upstream fix and issue rates measured (PKT-0017, above); no production crash telemetry; issue counts for ONLYOFFICE cover the whole product, not only the server | production telemetry, if a deployment exists |
| Unit oracle pass/fail and duration | command refused by permissions in this run | rerun `quality.sh` |

## Client: PKT-0066 A/B — remote-apply font collection, before/after (PKT-0071)

**Native package** 9.3.7-1 server, same VM; the client bundles are **self-built** with `npm run build:word` in
`external/sdkjs/build` (webpack, terser with `mangle:false`, names kept): *before* = `main` (9cea536), *after* = the
PKT-0066 files from fork branch `pkt/PKT-0066` (b152f87; the d46dde8 named in the packet was rebased away). Both are
injected into the editor with Playwright `context.route` on `sdkjs/word/sdk-all{,-min}.js` (and 404 on
`sdk-all.{bin,cache}`), so before and after are built and loaded the same way. Harness: user A and user B open
`large-100p.docx` (PKT-0016 sample), CDP Profiler on B at 100 µs; *text* = A types 30 markers (as PKT-0043 *apply*),
*style* = A changes the default paragraph style's font size 10 times (styles → documented full-walk fallback).
Samples under Playwright `evaluate`/`predicate` excluded. 3 runs per variant, means; self ms over the whole window.

| Case | Variant | B busy ms | font collection inclusive ms | `ParaRun.Get_AllFontNames` self | `Paragraph.Document_Get_AllFontNames` self | `CTextPr.Document_Get_AllFontNames` self | all `*AllFontNames` self | incremental fns self |
|---|---|---|---|---|---|---|---|---|
| text, 30 changes | before | 2 360 | 140 | 86 | 13 | 27 | 136 | — |
| text, 30 changes | after | 2 842 | 195 | 132 | 17 | 26 | 189 | 0.1 |
| style, 10 changes | before | 5 491 | 37 | 24 | 2.7 | 6.6 | 36 | — |
| style, 10 changes | after | 7 185 | 68 | 47 | 6.8 | 11 | 67 | 0 |

Per-run text inclusive: before 144 / 133 / 144, after 212 / 146 / 226; style after run 0 was 2× slower than all others
(busy 10 083 ms) and drives that mean. The after/before difference is run-to-run noise: no part of it is the new code
(0.1 ms).

Reading:
- **PKT-0066 gives no gain as delivered: the incremental path is never taken for remote typing.** Instrumenting
  `TakeFontCheckClasses` on B shows every incoming batch is `[CTableId, ParaRun]`: typing registers a new run, whose
  change class is `CTableId` (g_oTableId), not a text container, so `GetFontNamesFromClasses` returns null and
  `pre_Save` does the full `CheckFontNeeds` walk (stack `pre_Save < SendImagesCallback < OnStart_Load_Objects <
  Apply_Changes`), 30/30 batches. Follow-up requested (spawn from PKT-0071) to treat `CTableId` changes.
- **The achievable gain is small.** Font-name collection is ≈ 140 ms per 30 remote changes on 100 p (≈ 4.7 ms per
  change, ≈ 6 % of B's busy time); ParaRun is ~60 % of it. Repaint and recalc stay the remote-apply cost (PKT-0043).
- Style edits recalc the whole document (≈ 0.5 s per change); font collection is < 1 % there.
- Not measured: the installed (upstream-compiled) bundle; the self-built *before* stands in for it.

## Client: PKT-0066 A/B re-measured after PKT-0087 (PKT-0089)

Same recipe, harness and sample as "PKT-0066 A/B (PKT-0071)" above: native package 9.3.7-1 server, self-built word
bundles injected by Playwright routing, `large-100p.docx`, A types 30 markers, CDP Profiler on B at 100 µs, 3 runs per
variant, *text* case only. Three variants, all `npm run build:word` (webpack cache cleared between builds: with the cache, a
second build reused the first one's output):
*before* = PKT-0071's main 9cea536 build (no incremental code), *PKT-0066* = sdkjs `theseus` 3d51031,
*PKT-0087* = 3d51031 + e5fd187 (fork `pkt/PKT-0087`, CollaborativeEditing.js only, applied for the build and then reverted).
B wraps `TakeFontCheckClasses` and records, per batch, the classes it returns and whether `GetFontNamesFromClasses` gives non-null
(the incremental path).

| Variant | B busy ms | font collection inclusive ms | `ParaRun.Get_AllFontNames` self | all `*AllFontNames` self | incremental fns self | batches on incremental path |
|---|---|---|---|---|---|---|
| before | 3 387 | 237 | 171 | 232 | — | — |
| PKT-0066 | 3 791 | 214 | 127 | 207 | 3.2 | 0 / 133 |
| PKT-0087 | 3 518 | 194 | 116 | 188 | 2.2 | **0 / 131** |

(Batches > 30: `TakeFontCheckClasses` is called 39–49 times per run; every non-empty take was `[CTableId, ParaRun]`.)
This run's machine was busier than PKT-0071's (before: 237 ms vs 140 ms inclusive); differences between rows are noise.

Reading:
- **PKT-0087 gives no gain: 0 of 131 batches take the incremental path (expected 30/30), self-time gain ≈ 0 (expected ≈ 140 ms).**
- **Cause: PKT-0071 named the wrong change.** Dumping B's applied changes shows the `CTableId` entry of each batch is
  `CChangesTableIdDescription` (Type 131071 = `historyitem_TableId_Description`, fields `FileCheckSum, FileSize, Description,
  ItemsCount, PointIndex, …`: the per-point description record the sender adds), not `historyitem_TableId_Add` (65537).
  Typing into an existing run adds no new object, so PKT-0087's `TableId_Add` branch is never reached. Follow-up requested
  (spawn from PKT-0089): skip `historyitem_TableId_Description` changes (they carry no fonts) in `private_CollectFontCheckClasses`,
  then re-measure with this recipe.
- The ceiling stays as PKT-0071 found: font collection is ≈ 5–7 % of B's busy time on 100 p.

## Client: PKT-0066 A/B re-measured after PKT-0091 (PKT-0093)

Same recipe, harness shape and sample as "PKT-0066 A/B re-measured after PKT-0087 (PKT-0089)" above: native package 9.3.7-1
server, self-built word bundles injected by Playwright routing (`sdkjs/word/sdk-all{,-min}.js`, 404 on `sdk-all.{bin,cache}`),
`large-100p.docx`, A types 30 markers, CDP Profiler on B at 100 µs, 3 runs per variant, *text* case only. Bundles are the
differential oracle's cached builds (`.theseus/oracle/differential/build.sh`, fresh webpack cache per build):
*before* = sdkjs `main` 9cea536 (no incremental code, as in PKT-0071/PKT-0089),
*PKT-0091* = sdkjs fork `theseus` at the PKT-0091 merge 88df302 (tree `0cad68e`). That build **includes PKT-0087's
`TableId_Add` branch** (e5fd187's code is in `private_CollectFontCheckClasses` at 88df302, next to PKT-0091's
`historyitem_TableId_Description` skip); the *before* build has neither. No separate PKT-0066-only / PKT-0087-only row this time
(PKT-0089 already showed both at 0 batches incremental). B wraps `TakeFontCheckClasses`, `CheckFontNeedsIncremental` and
`CheckFontNeeds` and records, per take, the classes returned and whether the incremental path succeeded. Self ms over the whole window.

| Variant | B busy ms | font collection inclusive ms | all `*AllFontNames` self | incremental fns self | full `CheckFontNeeds` walks | batches on incremental path |
|---|---|---|---|---|---|---|
| before | 3 737 | 271 | 267 | — | 136 (45/43/48) | — |
| PKT-0091 | 3 459 | 0.5 | 0.1 | 0.4 | **0** | **143 / 143** (49/48/46) |

Per-run font collection inclusive: before 317 / 211 / 286 ms; PKT-0091 0.8 / 0.8 / 0.0 ms (wrapper wall time 1.6 / 1.6 / 1.1 ms).
Every take on B returned exactly one class, `ParaRun` (Type 39): the `CTableId` description change is now skipped.

Reading:
- **PKT-0091 works: 143 of 143 batches take the incremental path (expected 30/30; > 30 because pre_Save runs 46–49 times per
  30 markers), no full walk during remote typing.** Font collection on B drops from ≈ 270 ms to < 1 ms per 30 remote changes on
  100 p, about 2× the ≈ 140 ms PKT-0071 expected; this VM was busier (PKT-0089's *before* was 237 ms, PKT-0071's 140 ms), and the
  gain is the whole full-walk cost, which scales with machine load and document size.
- B busy time falls by ≈ 280 ms (≈ 7 %), consistent with the ceiling PKT-0071/PKT-0089 found (5–7 %); repaint and recalc remain
  the remote-apply cost.
- Not measured: the style case (full-walk fallback by design), the installed upstream bundle.

## Client: repaint scope per keystroke and per remote change (PKT-0109)

Script: `node .theseus/oracle/perf/word-repaint.js <file.docx> [sdkjs|bundle-dir|-] [runs]` (env `N` events per side,
`SETTLE` ms, `NOCLEAR=1` ceiling variant). Native package 9.3.7-1 server; word bundle self-built from sdkjs fork `theseus`
0f61ccc with `.theseus/oracle/differential/build.sh` and injected by Playwright routing (`sdkjs/word/sdk-all{,-min}.js`,
404 on `sdk-all.{bin,cache}`), as PKT-0093. `large-100p.docx` (86 pages as laid out), users A and B, viewport 1280×900
(canvas 1167×688, 1 page visible, page 1). *local* = A types 20 single characters at Ctrl+Home, measured on A; *remote* =
A types 20 markers, measured on B. Each event = counters reset → key → text in the model → 400 ms settle. 2 runs,
40 events per side, 2026-11-04. Entry points are wrapped on the live instances (CDocument, DrawingDocument, CEditorPage)
plus `CanvasRenderingContext2D.prototype.drawImage`; call-site stacks are recorded for each.

| Per event | local p50 | local mean | remote p50 | remote mean | local, NOCLEAR mean | remote, NOCLEAR mean |
|---|---|---|---|---|---|---|
| pages recalculated (distinct `OnRecalculatePage`) | 1 | 1.5 | 2 | 10.2 | 1.5 | 10.1 |
| recalc ms (`private_Recalculate`+`Recalculate_Page`; remote fast path not included, see below) | 13.7 | 18.5 | 0 | 35.5 | 17.4 | 27.2 |
| `ClearCachePages` (all page caches invalidated) | 1 | 1 | 2 | 2 | 0 | 0 |
| `OnRepaintPage` (single page invalidated) | 0 | 0 | 0 | 0 | 0 | 0 |
| pages re-rasterised (`StartRenderingPage`) | 2 | 1.8 | 2 | 2 | **1** | 1.8 |
| re-raster ms | 14.2 | 19.7 | 18.5 | 24.2 | **10.7** | 16.7 |
| `OnPaint` calls / ms (blit + re-raster) | 2 / 23.6 | 1.8 / 30.1 | 2 / 31 | 2.1 / 38.5 | 1.7 / 17.8 | 1.9 / 27.4 |
| `OnScroll` / `OnUpdateOverlay` / `UpdateTarget` calls | 3 / 3 / 3 | — | 6 / 4 / 4 | — | — | — |
| `UpdateTarget` ms | 0.4 | 0.5 | 0.1 | 0.2 | 0.4 | 0.2 |
| `drawImage` calls (≈ 99.8 % offscreen: glyphs into the page cache) | 3 872 | 3 470 | 3 954 | 3 951 | 1 956 | 3 556 |
| `drawImage` ms / Mpx | 15.3 / 2.1 | 17.2 / 1.9 | 19 / 2.1 | 25.1 / 2.2 | 10.8 / 1.7 | 18.6 / 2.0 |
| key → text in model ms | 63 | 75 | 357 | 404 | 69 | 485 |

On-screen blits are ~1.8 per event (`id_viewer`, one per `OnPaint`), each a whole visible page; there are no sub-page
rectangles: the invalidation unit is the page (`drawingPage.SetRepaint` / `cachedImage` unlock), and a dirty page is
re-rasterised whole (`StartRenderingPage → CDocument.DrawPage`), glyph by glyph (~2 000 `drawImage` per page on this sample).

Call sites that decide the redraw range:
- **Recalculation** (`word/Editor/Document.js`): local typing goes `EnterText → FinalizeAction → private_Recalculate →
  private_RecalculateFastParagraph` (36/40) or `private_RecalculateFastRunRange` (4/40), 1–2 pages; remote typing goes
  `CWordCollaborativeEditing.OnEnd_Load_Objects → RecalculateByChanges → private_RecalculateFastParagraph`, 1–2 pages, but
  **4–5 of 40 remote events fall back to `RecalculateWithParams` and recalc from page 0 to 85 (or 50) in the timer loop
  (`ContinueRecalculationLoop → Recalculate_Page`), 260–420 ms each**: that is all of the remote recalc mean.
- **Page invalidation**: `DrawingDocument.OnRecalculatePage` itself calls `drawingPage.SetRepaint` for each recalculated page
  (so the fast paths invalidate exactly the changed page), and `CDocument.Redraw/private_Redraw/OnRepaintPage` are not used.
- **All pages invalidated on every change**: `CWordCollaborativeEditing.Send_Changes` (`word/Editor/CollaborativeEditing.js`
  ~l. 237) calls `ClearCachePages(); FirePaint()` whenever `m_nUseType !== 1`, i.e. always in co-editing, "to redraw locks"
  — locally from `_onSaveCallback`, on B from `_autoSave → Continue_FastCollaborativeEditing` (twice per remote event).
  The visible page is thus re-rasterised a second time per event.
- **Paint**: `CEditorPage.OnPaint` from `PaintMessageLoop → onTimerScroll` re-rasterises each visible page whose cache was
  unlocked (`CheckRecalculatePage`) and blits it.

Ceiling:
- **Skip the lock-redraw clear when no lock changed** (`NOCLEAR` measures it as an upper bound): local re-raster goes from
  1.8 to 1 page per keystroke, OnPaint 30 → 18 ms, drawImage 3 470 → 1 956 (≈ −12 ms per keystroke, ≈ 40 % of paint).
  Remote: no gain measured (re-raster stays 1.8 per event): B's second re-raster comes from its own recalc passes
  (fast path, then the timer loop), not only from the clear. With more pages visible (zoom-out) the clear costs one
  re-raster per visible page.
- **Limit redraw to the changed lines** (not prototyped): a line-level dirty rect inside the page cache would replace a
  ~9–10 ms whole-page re-raster by a few lines' worth (the page has ~50 lines, so ≲ 1 ms): up to ≈ 9 ms per local
  keystroke after the clear fix, ≈ 15 ms per remote event; needs `StartRenderingPage`/`DrawPage` to clip to a rect.
- **Remote full-document fallback**: 4–5 of 40 remote events recalc all 86 pages (≈ 300 ms each, ≈ 35 ms per event on
  average): the largest remote item, and why "key → text in model" p90 is high; why the fast path is refused there was not
  traced (follow-up requested).

Not measured: the remote fast-path recalc time (`RecalculateByChanges` → `private_RecalculateFastParagraph` is not wrapped:
the 0 ms remote p50 is that gap, not zero work); several visible pages; the installed upstream bundle.

## Client: documenteditor Toolbar view's hidden panels deferred past asc_LoadDocument (PKT-0125)

Native 9.3.7-1 stack, 2-CPU VM. `perf/toolbar-ab.sh` swaps the built `app.js` (web-apps-build.sh: base
`external/web-apps.base` tree dd7510be vs new fork pkt/PKT-0125 0fc7c875) into the installed server and runs
`perf/open-window.js` in 5 blocks × 3 runs per side, sides alternating per block (15 opens per side per file, cold
cache, profiled + unprofiled). Raw per-run data: `perf/toolbar-ab-2026-11-04/`; table: `perf/toolbar-ab-summary.py`.
Run 06:27–06:36 UTC, started at load 1.6 with no other packet running; another packet started during it (load 3–5
by block 2), and the alternation spreads that load over both sides.
Toolbar = `ctlCode.LoadDoc.Toolbar` (ms of CPU before LoadDoc attributed to the Toolbar controller); LoadDoc/Ready =
unprofiled marks (ms after goto). Spread = p25–p75 (min–max).

medium-10p.docx
| metric | base median (p25–p75, min–max) | new median (p25–p75, min–max) | Δ median | per-block Δ (median; blocks new<base) |
|---|---|---|---|---|
| Toolbar (n=15) | 203 (170–218, 135–266) | 152 (126–168, 116–237) | -51 | -55; 5/5 |
| LoadDoc (n=15) | 1123 (1102–1192, 1050–1376) | 1243 (1070–1303, 967–1409) | +119 | +88; 1/5 |
| Ready (n=15) | 3109 (3008–3150, 2859–3269) | 3094 (2998–3182, 2775–3346) | -15 | -48; 3/5 |

large-100p.docx
| metric | base median (p25–p75, min–max) | new median (p25–p75, min–max) | Δ median | per-block Δ (median; blocks new<base) |
|---|---|---|---|---|
| Toolbar (n=15) | 196 (176–227, 126–268) | 157 (141–197, 102–211) | -39 | -51; 3/5 |
| LoadDoc (n=15) | 1169 (1124–1342, 1030–1443) | 1170 (1101–1263, 879–1336) | +1 | +41; 2/5 |
| Ready (n=15) | 3378 (3313–3540, 3197–3673) | 3410 (3354–3434, 3246–3596) | +32 | +27; 2/5 |

Busy CPU before LoadDoc (all non-idle categories, profiled opens): medium 964 (928–1035) → 930 (913–962);
large 947 (899–1012) → 903 (879–954).

Reading:
- Toolbar self time drops 51 ms (medium, 5/5 blocks lower) and 39 ms (large, 3/5 blocks lower). On medium the
  drop just exceeds the p25–p75 spread (48 ms base, 42 ms new); on large it does not (51 ms base). The packet's
  bar (drop > run spread) is met for medium only, and not against min–max on either file.
- The LoadDoc mark does not move (+119 medium, +1 large, within its 100–250 ms spread); Ready is flat.
- The ~220 ms of Toolbar self time is not mostly the hidden panels' DOM injection: deferring it moves ~40–55 ms.
  The rest is the Toolbar view's `initialize` (75 `new Common.UI.Button` and the pickers, for every tab, built
  before render), the template parse and the Home panel. Deferring construction needs the controller's launch-time
  bindings on those buttons moved too: follow-up requested.
- A first run the same morning with another packet running all along (load 5–9) gave −56 / −28 ms Toolbar with
  p25–p75 spreads of 88 / 76 ms: noise dominated.

### Attempt 3: non-Home components constructed after asc_LoadDocument (PKT-0125)

Same method (`perf/toolbar-ab.sh`, 5 blocks × 3 runs per side, sides alternating), base dd7510be vs new fork
pkt/PKT-0125 (attempt 3 working tree). Raw data: `perf/toolbar-ab-2026-11-04b/`. Run 07:04–07:13 UTC, started at
load 0.9; load was 3.4–4.8 during the run (our own chrome/node plus another executor session). `Busy` = all non-idle
CPU before LoadDoc (profiled opens), new column in `perf/toolbar-ab-summary.py`.
Change: view/Toolbar.js builds the Insert and Layout components (32 named components, the page-break buttons and
the HeaderFooterTab buttons in Insert slots) from a 0 ms timer after render, which runs after asc_LoadDocument
(checked in a probe: the build starts 10–20 ms after the LoadDoc call), or on first activation of a non-Home tab,
app:ready or createDelayedElements, whichever comes first.

medium-10p.docx
| metric | base median (p25–p75, min–max) | new median (p25–p75, min–max) | Δ median | per-block Δ (median; blocks new<base) |
|---|---|---|---|---|
| Toolbar (n=15) | 181 (175–217, 123–272) | 131 (117–162, 99–211) | -50 | -47; 5/5 |
| Busy (n=15) | 965 (921–1025, 881–1247) | 919 (845–986, 765–1147) | -46 | -52; 4/5 |
| LoadDoc (n=15) | 1268 (1214–1334, 1121–1422) | 1236 (1151–1326, 1020–1417) | -32 | +10; 2/5 |
| Ready (n=15) | 3181 (3127–3281, 2870–3338) | 3156 (3104–3267, 3053–3565) | -25 | -15; 3/5 |

large-100p.docx
| metric | base median (p25–p75, min–max) | new median (p25–p75, min–max) | Δ median | per-block Δ (median; blocks new<base) |
|---|---|---|---|---|
| Toolbar (n=15) | 233 (201–256, 155–311) | 161 (136–179, 98–203) | -72 | -60; 5/5 |
| Busy (n=15) | 1020 (946–1063, 905–1437) | 967 (917–1002, 811–1211) | -53 | -78; 4/5 |
| LoadDoc (n=15) | 1188 (1126–1291, 980–1414) | 1100 (1068–1195, 976–1262) | -88 | -72; 3/5 |
| Ready (n=15) | 3574 (3337–3636, 3193–3953) | 3433 (3401–3560, 3284–3836) | -141 | -73; 3/5 |

Reading:
- Toolbar drops 50 ms on medium (p25–p75 spread 42 base / 45 new) and 72 ms on large (55 / 43): above the
  p25–p75 spread on both files, with 5/5 blocks lower on each. It is not above the min–max range on either file.
- Busy CPU before LoadDoc drops 46 / 53 ms (4/5 blocks), which is below its p25–p75 spread (~100 ms): the work
  moves out of the window, but the run is too noisy to show that on total CPU by itself.
- LoadDoc and Ready move inside their spread.
- Measured in a probe, the deferred construction is only ~12–37 ms (it depends on JIT warm-up). Most of what moved
  is DOM injection plus construction. The remaining ~130–160 ms of Toolbar time is the Home panel, the template and the
  HeaderFooterTab/ViewTab panels built in onAppShowed (follow-up requested).
