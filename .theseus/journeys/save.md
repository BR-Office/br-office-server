---
journey: save
goals_hash: dcb03039
round: 3
total_ms: 5853
measured_by: claude-opus-5-5
packet: PKT-0130
date: 2026-11-04
---
# Journey save: close an edited Word document until the saved file is available

Measure: `bash .theseus/oracle/journeys/save.sh` → `total_ms=5853 min_ms=5771 max_ms=5978 runs=7` (`RUNS=7`; default 5;
load average ~1.2). Build: **integrated** (`serve-integrated.sh up`: sdkjs word bundle 0f61ccce from the fork's collecting
branch over the native package; core and web-apps `theseus` == `main`; server = packaged binary). Headless Chromium, 2-CPU VM.

Per run: `open-docx-10p.docx` uploaded to the example, opened, 5 letters typed, changes acknowledged, then the only editor
tab is closed (t0 = `page.close()`). End = the example's stored file (`/var/lib/euro-office/documentserver-example/files/127.0.0.1/<name>`)
is replaced by the saved version (polled every 10 ms). Stages come from the DocService and FileConverter DEBUG logs
(same clock, 1 ms resolution).

## Stages (p50 per run, ms; means in brackets)
| stage | module | ms | share |
|---|---|---|---|
| disconnect: tab close → DocService sees `transport close` | project (browser) | 13 [13] | 0.2% |
| save-delay: socket closed → `Start saveFromChanges` (sleep `savetimeoutdelay` = 5000 ms) | docservice | 5006 [5006] | 85.5% |
| queue: saveFromChanges → AddTask → RabbitMQ → converter `Start Task` | docservice | 4 [4] | 0.1% |
| prepare: download Editor.bin + changes from storage, write them to the temp dir | common | 20 [25] | 0.3% |
| x2t: spawn x2t, doctrenderer (V8 + sdk-all.js) applies the changes, writes output.docx | x2t | 774 [787] | 13.2% |
| upload: output.docx, changes.zip, changesHistory.json to storage; postProcess | common | 4 [5] | 0.1% |
| result: converter response → DocService `receiveTask` → `commandSfcCallback` → postData status 2 | docservice | 6 [6] | 0.1% |
| integrator: example `/track` downloads the file and replaces it in its storage | project | 9 [11] | 0.2% |
| unattributed (stages are contiguous log marks; p50s add to 5836) | | 17 | 0.3% |

## Reading
- **86% of the save is a fixed sleep.** `createSaveTimer` (DocService/sources/DocsCoServer.js:1556) waits
  `services.CoAuthoring.server.savetimeoutdelay` (5000 ms, default.json) after the last user leaves, so that a user who
  reconnects (reload, network blip) finds the session still open. Every close pays it in full; the spread across runs
  is ±100 ms, all of it in x2t. The lever is configuration or a smarter policy (e.g. save immediately when the close
  was an explicit `closeDocument`/beforeunload, keep the delay only for `transport close` without a goodbye):
  ~5 s → ~0.85 s. Spawned a packet request for docservice.
- The only real work is x2t (774 ms for a 10-page docx with 5 letters of changes): process start, doctrenderer loading
  the sdkjs word bundle in V8, applying the changes, and the bin→docx write. Not split further in this round (the
  converter deletes its temp dir and x2t has no internal timing log); the x2t module's next diagnosis must split it.
  Round 2 (`rounds/x2t-r2.md`) saw x2t's part of save at 0.2–0.65 s on smaller documents: consistent.
- Server plumbing (queue, storage, callback) is ~40 ms in total; the browser side is the socket close only.

## Comparison with earlier rounds
No earlier save map exists in `.theseus/journeys/`. `oracle/baseline.md` lists Save as a path (DocsCoServer → x2t →
storage → callback) without a number; `rounds/x2t-r2.md` gives x2t's part only. This is the first end-to-end map.

```yaml
stages:
  - id: disconnect
    module: project
    files: []
    functions: ["browser closes the editor WebSocket (page close)"]
    ms: 13
    share: 0.2
  - id: save-delay
    module: docservice
    files: [DocService/sources/DocsCoServer.js]
    functions: [createSaveTimer (utils.sleep(savetimeoutdelay)), closeDocument, cleanDocumentOnExit]
    ms: 5006
    share: 85.5
  - id: queue
    module: docservice
    files: [DocService/sources/canvasservice.js, Common/sources/taskqueueRabbitMQ.js]
    functions: [canvasService.saveFromChanges, TaskQueueRabbitMQ.addTask]
    ms: 4
    share: 0.1
  - id: prepare
    module: common
    files: [FileConverter/sources/converter.js, Common/sources/storage/storage-base.js]
    functions: [ExecuteTask, downloadFileFromStorage, processChangesBin]
    ms: 20
    share: 0.3
  - id: x2t
    module: x2t
    files: [FileConverter/sources/converter.js, external/core/X2tConverter/src/ASCConverters.cpp, external/core/DesktopEditor/doctrenderer/doctrenderer.cpp]
    functions: [spawnProcess (x2t), NSDoctRenderer::CDoctrenderer::Execute (apply changes in sdkjs), doct_bin2docx]
    ms: 774
    share: 13.2
  - id: upload
    module: common
    files: [FileConverter/sources/converter.js, Common/sources/storage/storage-base.js]
    functions: [processUploadToStorage, postProcess]
    ms: 4
    share: 0.1
  - id: result
    module: docservice
    files: [DocService/sources/DocsCoServer.js, DocService/sources/canvasservice.js]
    functions: [receiveTask, commandSfcCallback, sendServerRequest (postData)]
    ms: 6
    share: 0.1
  - id: integrator
    module: project
    files: []
    functions: ["example /track handler: download url, replace stored file"]
    ms: 9
    share: 0.2
unattributed_ms: 17
```
