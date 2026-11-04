---
journey: convert-docx-pdf
goals_hash: dcb03039
round: 3
total_ms: 1200
measured_by: claude-opus-5-5-b
packet: PKT-0131
date: 2026-11-04
---
# Journey convert-docx-pdf: convert a Word document to PDF through the server until the PDF is returned

Measure: `bash .theseus/oracle/journeys/convert-docx-pdf.sh` → `total_ms=1200 min_ms=1083 max_ms=1251 runs=9` (`RUNS=9`;
default 7; load average ~0.9–1.1). Build: **integrated** (`serve-integrated.sh up`: sdkjs word bundle 0f61ccce over the native
package; core and web-apps `theseus` == `main`; server = packaged binary) — but see the caveat below: x2t does not run the
overlaid bundle. Native package, 2-CPU VM, no browser (the user of this journey is an integrator calling the API).

Per run: a fresh key; `POST /ConvertService.ashx` `{async:true, filetype:docx, outputtype:pdf, url}` where `url` points to
`open-docx-10p.docx` (10 pages, served by the runner on 127.0.0.1), JWT-signed with the inbox secret; the same request is
re-posted every 20 ms (`POLL`) until `endConvert`, then `fileUrl` is downloaded to the last byte (end). t0 = first POST sent.
Stages come from the DocService and FileConverter DEBUG logs filtered by the key (same clock, 1 ms resolution).

## Stages (p50 per run, ms; means in brackets)
| stage | module | ms | share |
|---|---|---|---|
| request: POST → nginx → DocService `convertRequest` (`Start convert request`) | docservice | 3 [5.6] | 0.3% |
| queue: convertRequest → `addTask` → RabbitMQ → converter `Start Task` | docservice | 3 [4.8] | 0.3% |
| download: converter fetches the source docx from the integrator URL | common | 5 [5] | 0.4% |
| x2t: spawn x2t, docx → PDF, exit | x2t | 1174 [1144] | 97.8% |
| upload: output.pdf to storage, postProcess, `End Task` | common | 3 [3.1] | 0.3% |
| result: converter response → DocService `receiveTask` | docservice | 1 [1.4] | 0.1% |
| poll: result stored → client's next poll sees `endConvert` (bounded by POLL = 20 ms) | project | 19 [17.2] | 1.6% |
| fetch: GET fileUrl (nginx static from cache/files) | project | 1 [0.8] | 0.1% |
| unattributed (stages are contiguous log marks) | | 0 | 0% |

Stage p50s add to 1209 vs total p50 1200 (0.75%).

### Inside x2t (standalone runs of the same binary on the same file, as root from FileConverter/bin)
| x2t sub-step | evidence | ms (of ~1050 standalone) |
|---|---|---|
| process start + OOXML read, docx → internal DOCT bin (`docx2doct_bin`) | `x2t in.docx out.bin` = 69–80 ms | ~75 |
| DoctRenderer start: V8 + sdkjs word **snapshot** `sdk-all.bin` (6.9 MB) + AllFonts.js, open the document in JS | empty template docx → pdf = 461–545 ms; strace: snapshot opened at +154 ms, first font opened at +782 ms | ~390 |
| layout of 10 pages in sdkjs word + drawing them through the native graphics/PdfFile writer | 10p − empty ≈ 1050 − 465 | ~585 |

The converter's in-service x2t (1174) is ~120 ms above the standalone number: spawn from Node as user `ds` and file
system under the converter's temp dir; not split further.

## Reading
- **The whole journey is x2t (98%)**; the server's plumbing (HTTP, JWT, RabbitMQ, storage, response) is ~15 ms in
  total and our own polling adds ≤ POLL. An integrator using the server's sync mode would pay up to ~1 s more:
  the sync mode re-checks internally about once a second (baseline.md, PKT-0015).
- Inside x2t ~45% is fixed per conversion (process start, V8 + sdkjs snapshot, fonts) and paid even for an empty
  document; ~55% scales with the document (sdkjs layout and PDF drawing). Levers: a resident renderer (no per-task
  process/V8/snapshot start: up to ~0.45 s off every conversion) and the layout/draw path for the rest.
  The x2t module's next diagnosis must cover all three sub-steps; the sdkjs-word layout part is shared with open.
- **Caveat — the integrated build is not integrated inside x2t.** DoctRenderer loads `sdkjs/word/sdk-all.bin`
  (V8 snapshot, `GetSnapshotPath`, external/core/DesktopEditor/doctrenderer/editors.cpp) when it exists, and
  `serve-integrated.sh up` only replaces sdk-all.js and removes sdk-all.cache: the snapshot is the packaged one
  (2026-11-02). With the snapshot moved aside x2t regenerated it (first run 1451 ms, then 970–1107 ms, same PDF
  size), so speed should not move much, but the code measured in x2t is the packaged sdkjs. The same holds for the
  save journey (PKT-0130). Spawned a request to fix serve-integrated.sh. A/B packaged vs integrated: x2t standalone
  1011–1088 ms packaged vs 1049–1092 ms integrated (same snapshot, so same code: noise).

## Comparison with earlier rounds
No earlier convert-docx-pdf map exists in `.theseus/journeys/`. The baseline (PKT-0015, Docker image, async poll 50 ms,
the 7.7 kB `new.docx` template) gave docx → pdf p50 767 ms with x2t 70–90% of it; this round's 10-page document costs
1200 ms with x2t at 98% (the bigger document grows only the x2t part; empty template → pdf is ~465 ms standalone today).
`rounds/x2t-r2.md` saw x2t as the cost of every conversion: consistent.

```yaml
stages:
  - id: request
    module: docservice
    files: [DocService/sources/converterservice.js, Common/sources/utils.js]
    functions: [convertRequest, checkJwt]
    ms: 3
    share: 0.3
  - id: queue
    module: docservice
    files: [DocService/sources/converterservice.js, Common/sources/taskqueueRabbitMQ.js]
    functions: [convertByCmd, TaskQueueRabbitMQ.addTask]
    ms: 3
    share: 0.3
  - id: download
    module: common
    files: [FileConverter/sources/converter.js, Common/sources/utils.js]
    functions: [ExecuteTask, downloadFile, utils.downloadUrlPromise]
    ms: 5
    share: 0.4
  - id: x2t
    module: x2t
    files: [FileConverter/sources/converter.js, external/core/X2tConverter/src/ASCConverters.cpp, external/core/DesktopEditor/doctrenderer/doctrenderer.cpp, external/core/DesktopEditor/doctrenderer/editors.cpp, external/core/PdfFile]
    functions: [ExecuteTask (spawn x2t), docx2doct_bin (OOXML read ~75 ms), NSDoctRenderer::CDoctrenderer::Execute, ExecuteScript, RunEditor (V8 + sdk-all.bin snapshot ~390 ms), sdkjs word layout + PDF drawing (~585 ms)]
    ms: 1174
    share: 97.8
  - id: upload
    module: common
    files: [FileConverter/sources/converter.js, Common/sources/storage/storage-base.js]
    functions: [processUploadToStorage, processUploadToStorageChunk, postProcess]
    ms: 3
    share: 0.3
  - id: result
    module: docservice
    files: [DocService/sources/canvasservice.js]
    functions: [canvasService.receiveTask]
    ms: 1
    share: 0.1
  - id: poll
    module: project
    files: [.theseus/oracle/journeys/convert-docx-pdf-run.cjs]
    functions: ["integrator re-posts every POLL=20 ms until endConvert"]
    ms: 19
    share: 1.6
  - id: fetch
    module: project
    files: []
    functions: ["nginx serves cache/files/.../output.pdf"]
    ms: 1
    share: 0.1
unattributed_ms: 0
```
