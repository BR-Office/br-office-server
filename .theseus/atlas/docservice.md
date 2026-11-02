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
- `database.js` is dead code (PKT-0020): an old MongoDB helper (`insert`/`remove`/`load`) that nothing requires and that cannot load. See "Findings" below. Do not migrate, test or refactor it. [model]
- `editorDataRedis.js` is listed in three `pkg.scripts` lists (`DocService/package.json:48`, `FileConverter/package.json:24`, `AdminPanel/server/package.json:30`) but does not exist in this repository. It is only a packaging entry: no code path loads it unless the config sets `editorDataStorage`/`editorStatStorage` to `editorDataRedis`, which would crash at startup (`MODULE_NOT_FOUND` from `DocsCoServer.js:100-101`, `changes2forgotten.js:42`, `notificationService.js:36`). [model]

## Findings (PKT-0020, 2026-11-02)

**`DocService/sources/database.js` is dead code.** Evidence, all from `grep -rnI --exclude-dir=node_modules --exclude-dir=.git` over the whole repository (sources, tests, `Gruntfile.js`, `Makefile`, `.docker/server.bake.Dockerfile`, `.github/workflows`, every `package.json`):
1. **No static caller.** No `require` of `./database`, `sources/database` or `database.js` anywhere. Every `database` hit is `databaseConnectors/*` (a different directory) or a Theseus document. [model]
2. **No dynamic caller.** The only computed `require` paths in DocService/Common are `'./' + cfgEditorDataStorage` / `cfgEditorStatStorage` (`DocsCoServer.js:100-101`, `changes2forgotten.js:42`, `notificationService.js:36`, default `editorDataMemory`) and `moduleReloader.reloadNpmModule(moduleName)` (npm modules only). Setting the editor-data storage to `database` would not work either: the module exports neither `EditorData` nor a constructor. [model]
3. **Not shipped.** It is not a `bin` entry and not in any `pkg.scripts` list, and nothing reachable requires it, so `pkg` does not bundle it into the `docservice` binary. [model]
4. **Cannot load.** `require('mongodb')` fails: `mongodb` is not in any `package.json` or `npm-shrinkwrap.json` (root, `Common`, `DocService`) and there is no `node_modules/mongodb` in the worktree (the only `mongodb` directories are `@sentry/server-utils` integration folders). `require('./config.json')` would fail next: `DocService/sources/config.json` is not tracked and does not exist. Expected result is `MODULE_NOT_FOUND` for `mongodb` on the first line. Not executed: this factory run did not allow running `node`; a reviewer can confirm with `cd DocService/sources && node -e "require('./database.js')"`. [model]
5. **Obsolete API.** It uses `new mongoDB.Db(name, new mongoDB.Server(...))` and `db.open`, a 2.x-era driver API (`Db.prototype.open` was dropped in driver 3.0), so even with `mongodb` installed it would need an old driver. [model]
6. **Still costs something.** ESLint lints it (not in `eslint.config.js` ignores) and `tsconfig.json` includes it via `DocService/sources/**/*`. Git history cannot date it: the repository history starts at a single import commit. [model]

**Why `pkg.scripts` lists the absent `editorDataRedis.js`.** Most likely the lists were inherited from the upstream server, where a Redis `EditorData` backend is shipped outside the open-source tree (the `Gruntfile.js:30-68` `--addon` mechanism merges extra `package.json` files from sibling directories for such add-ons). Not provable from this repository, whose history starts at one import commit. In this repository it is a stale entry. `pkg` expands `scripts` as globs, so a missing file should match nothing and not fail the build (not run here). Answer to the open question "Which `EditorData` backends are used in production?": in this repository only `editorDataMemory` can run. [model]

**Proposed packets (not created).** This factory run forbade writes under `.theseus/queue/`, so `theseus packet new` could not be run. To create:
- `refactor` (docservice, low): delete `DocService/sources/database.js`. Acceptance: `grep -rn "sources/database'\|require('./database')" --exclude-dir=node_modules .` is empty, unit oracle and `npx eslint DocService/sources` pass.
- `refactor` (docservice, low): remove `./sources/editorDataRedis.js` from `DocService/package.json` `pkg.scripts`.
- `refactor` (fileconverter, low): remove `../DocService/sources/editorDataRedis.js` from `FileConverter/package.json` `pkg.scripts`.
- `refactor` (adminpanel, low): remove `../../DocService/sources/editorDataRedis.js` from `AdminPanel/server/package.json` `pkg.scripts`.
The three `pkg.scripts` edits change no runtime behaviour; check first that no deployment of this fork supplies its own `editorDataRedis.js` at build time.

## Hotspots
No profiling data. `DocsCoServer.js` is the structural hotspot (size, coupling, no tests). `getPresence` is called on most publish/close paths and may dominate with many connections. [model]

## Available oracle
None for the core. `DocsCoServer.js`, `canvasservice.js`, `converterservice.js` and `wopiClient.js` have **no unit tests**. Only `utilsDocService.js` is unit-tested. Integration tests in `tests/integration/` need a running server and databases and are outside the pilot oracle. Any refactor here needs a `characterize` packet first (R5). [model]

## Open questions
- Split into submodules? Proposed: `coserver/connection` (io setup, auth, endAuth), `coserver/locks` (lock checks, recalc index), `coserver/changes` (saveChanges, publish), `coserver/save` (save timer, force-save), `coserver/pubsub` (pubsubOnMessage), `coserver/commands` (commandFromServer), plus `canvas`, `converter`, `wopi`, `storage` (databaseConnectors, taskresult, editorData). [model]
- Can `install` closures be lifted to module level to enable unit tests without behaviour change? [model]
- Which `EditorData` backends are used in production? In this repository only `editorDataMemory` exists; `editorDataRedis.js` is a stale `pkg` entry (PKT-0020). Whether a deployment supplies its own Redis backend is outside the repository. [model]

## Lessons
- PKT-0020: a "no callers" check must cover computed `require` paths (`require('./' + cfg...)`) and packaging lists (`bin`, `pkg.scripts`), not only literal `require('./x')`. In this repository the computed ones are the editor-data storage selector and `moduleReloader`. [model]
- PKT-0020: dead code here is found by three independent signals: no literal or computed caller, no packaging entry, and a dependency absent from every lockfile. [model]
