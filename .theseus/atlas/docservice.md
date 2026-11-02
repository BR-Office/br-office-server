---
id: docservice
title: Co-editing coordination server (sessions, saves, conversions, WOPI)
kind: module
parent: null
paths: [DocService/sources/]
languages: null                   # tool: not computed yet
size: null                        # tool: not computed yet (packet estimate ~14,700 lines)

base_commit: 86d11c4
updated_at: 2026-11-02
updated_by: claude-opus-5-5
verified_by: null
freshness: current

dependencies:                     # tool: no graph.json yet
  uses: null
  used_by: null
  fan_in: null
  fan_out: null

metrics:                          # tool: not computed yet
  cpu_pct: null
  churn_90d: null
  coverage: null
  hotspot: null

oracle:
  level: none
  sources: [tests/unit/utilsDocService.tests.js (utilsDocService only)]

verdict: null
---

## Responsibility
Runs the Express + socket.io server that coordinates co-editing: editor connections, presence, locks, change storage, save/force-save assembly and callbacks to the integrator, plus HTTP endpoints for conversion, download, upload and WOPI hosting. It does NOT convert files (it queues tasks for FileConverter over RabbitMQ) and does not render documents (the editors run in the browser). [model]

## Entry points
- `server.js` — process entry: builds the Express app, registers every HTTP route, calls `DocsCoServer.install`, then listens. [model]
- `DocsCoServer.install(server, app, cb)` — socket.io server, `io.use` JWT check, `connection`/`message`/`disconnect` handlers, pubsub and queue wiring, periodic timers. [model]
- `DocsCoServer.commandFromServer` — `/command`, `/coauthoring/CommandService.ashx` (info, drop, saved, forcesave, meta, forgotten*, version, license). [model]
- `canvasservice.js` — `openDocument`, `saveFromChanges`, `receiveTask` (queue responses), `downloadAs`, `saveFile`, `printFile`, `downloadFile`. [model]
- `converterservice.js` — `/converter`, `/ConvertService.ashx`, `/docbuilder`, `convert-to`. [model]
- `wopiClient.js` — `/hosting/discovery`, `/hosting/wopi/...` editor HTML, WOPI lock/unlock/putFile calls to the host. [model]
- `databaseConnectors/baseConnector.js` — picks mysql/mssql/oracle/postgres connector by config; `taskresult.js` wraps the task-result table. [model]
- `editorDataMemory.js` — `EditorData`/`EditorStat`: presence, locks, messages, force-save state; selected by `services.CoAuthoring.server.editorDataStorage`. [model]

## Main flow
1. `server.js` reads the license, then `install` creates socket.io, pubsub, task queue, starts `gc`, checks DB table schemas, connects `editorData`/`editorStat`, and only then calls back to `listen` and register routes. [model]
2. Connect: `io.use` verifies the browser/session JWT; on `connection` the socket gets session timestamps and message handlers. [model]
3. `auth` message: decode JWT (normal or WOPI), `canvasService.commandOpenStartPromise` upserts the task row, license check, `connections.push`, `endAuth` takes the auth lock for the first editor and sends participants, locks, messages and changes. [model]
4. Editing: `getLock` stores block locks; `saveChanges` takes a save lock, inserts changes into the changes table, then `publish`es them to other participants (direct call when all are local, RabbitMQ pubsub otherwise). [model]
5. Close/disconnect: `closeDocument` removes presence and locks; when the last editor leaves with changes (or forgotten files), `createSaveTimer` sets status `SaveVersion`, waits `savetimeoutdelay`, and `canvasService.saveFromChanges` queues an `sfc` task. [model]
6. FileConverter answers on the queue; `canvasService.receiveTask` updates the row, sends the callback to the integrator (or WOPI `putFile`), then cleans the document. [model]
7. Background: `expireDoc` (idle/absolute session expiry, connection counters) and `refreshWopiLock` reschedule themselves with `setTimeout`. [model]

## Invariants
- Changes are stored before they are published; `syncChangesIndex` reflects the stored index. [model]
- A save only starts if `taskResult.updateIf` moves status `Ok` → `SaveVersion`; `saveFromChanges` re-checks `status_info` and drops stale timers. [model]
- View-only or closed-co-authoring connections sending `getLock`/`saveChanges`/`isSaveLock` are disconnected with ACCESS_DENIED. [model]
- Every handler builds its own `operationContext.Context` and calls `initTenantCache` before reading per-tenant config. [model]

## Pitfalls
- Circular requires: `canvasservice`, `converterservice`, `gc`, `fileuploaderservice`, `ai/aiProxyHandler` and `changes2forgotten` all require `DocsCoServer`, which requires them back. Exports are read lazily at call time. [model]
- Module-level mutable state in `DocsCoServer.js`: `connections`, `pubsub`, `queue`, `shutdownFlag`, `preStopFlag`, `pubsubOnMessage` (assigned inside `install`). [model]
- `install` is about half the file: most handlers are closures inside it, so they cannot be required or tested in isolation. [model]
- Mixed async styles: `co` generators (`function*`, `yield*`) next to `async/await`. [model]
- Default `editorDataMemory` keeps state in-process, so multi-node deployments need another `EditorData` implementation (none in this repo). [model]
- `changes2forgotten.js` is a standalone script: it runs `shutdown()` on load and calls `process.exit`. Never require it from the server. [model]
- `_checkLicenseAuth` always returns Success (open-source build); license plumbing remains. [model]

## Hotspots
No profiling data. `DocsCoServer.js` is the structural hotspot (size, coupling, no tests). `getPresence` is called on most publish/close paths and may dominate with many connections. [model]

## Available oracle
None for the core. `DocsCoServer.js`, `canvasservice.js`, `converterservice.js` and `wopiClient.js` have **no unit tests**. Only `utilsDocService.js` is unit-tested. Integration tests in `tests/integration/` need a running server and databases and are outside the pilot oracle. Any refactor here needs a `characterize` packet first (R5). [model]

## Open questions
- Split into submodules? Proposed: `coserver/connection` (io setup, auth, endAuth), `coserver/locks` (lock checks, recalc index), `coserver/changes` (saveChanges, publish), `coserver/save` (save timer, force-save), `coserver/pubsub` (pubsubOnMessage), `coserver/commands` (commandFromServer), plus `canvas`, `converter`, `wopi`, `storage` (databaseConnectors, taskresult, editorData). [model]
- Can `install` closures be lifted to module level to enable unit tests without behaviour change? [model]
- Which `EditorData` backends are used in production (Redis outside the repo?) [model]
- Is `database.js` (reads `./config.json`, no callers found by grep) dead code? [model]

## Lessons
Nothing known yet.
