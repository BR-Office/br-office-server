---
id: docservice
title: Document coordination server (co-editing, conversion requests, WOPI)
kind: module
parent: null
paths: [DocService/sources/, DocService/public/]
languages: null                   # tool — no graph.json yet
size: null                        # tool — no graph.json yet (see Open questions)

base_commit: 23392b575576b4e7b1580e51b817094a8b2aa365
updated_at: 2026-11-02
updated_by: claude-opus-5-5
verified_by: null
freshness: current

dependencies: null                # tool — .theseus/atlas/graph.json does not exist
metrics: null                     # tool — not computed yet

oracle:
  level: partial
  sources: [jest unit tests in tests/unit, integration tests in tests/integration]

verdict: null
---

## Responsibility
DocService is the Node.js/Express HTTP + socket.io server that coordinates collaborative editing sessions, accepts conversion/command requests from integrators, and acts as a WOPI client/host shim [model]. It does NOT convert documents itself (it queues tasks for FileConverter via RabbitMQ) and does not own storage backends, which live in `Common/sources/storage/` [model].

## Entry points
- `DocService/sources/server.js` — process entry (`bin.docservice`); builds the Express app and registers all routes (lines ~94–462).
- `DocsCoServer.js` `install(server, app, cb)` — attaches socket.io co-editing; `commandFromServer` serves `/coauthoring/CommandService.ashx` and `/command`; `healthCheck`, `shutdown`, `preStop` serve `/healthcheck` and `/internal/cluster/*`.
- `converterservice.js` — `convertXml`/`convertJson` (`/ConvertService.ashx`, `/converter`), `convertTo` (`/lool|/cool/convert-to`), `builder` (`/docbuilder`).
- `canvasservice.js` — `downloadAs`, `saveFile`, `printFile`, `downloadFile`; `receiveTask` consumes converter results; `openDocument`, `saveFromChanges`.
- `wopiClient.js` — `/hosting/discovery`, `/hosting/capabilities`, dummy `/wopi/files/*` endpoints; lock/unlock/putFile toward the WOPI host.
- `fileuploaderservice.js` `uploadImageFile` — `/upload/:docid*`.
- `ai/aiProxyHandler.js` `proxyRequest` — `/ai-proxy`.
- `routes/info.js`, `routes/meta.js`, `routes/static.js` — `/info`, `/meta`, static files.
- `gc.js` (`bin.gc`) and `shutdown.js` (`bin.prepare4shutdown`) — separate executables.

## Main flow
1. `server.js` loads `config`, creates Express + HTTP server and calls `docsCoServer.install` [model].
2. A client opens a document over socket.io; the JWT is checked (`checkJwt`) and the connection is registered in `editorData` [model].
3. If not cached, `canvasservice.openDocument` upserts a row in the task-result table (`taskresult.js`) and pushes a conversion task to RabbitMQ (`Common/sources/taskqueueRabbitMQ`) [model].
4. FileConverter replies; `canvasservice.receiveTask` updates status and notifies editors [model].
5. Edits are broadcast between editors and persisted as changes; cross-instance messages go through `pubsubRabbitMQ.js` [model].
6. When the last editor leaves (or on force-save), `saveFromChanges` queues a build, then the integrator callback URL (or WOPI `putFile`) receives the result [model].
7. `gc.js` periodically expires files/tasks (`checkFileExpire`) [model].

## Invariants
- Server-to-server endpoints (command, convert, healthcheck, internal cluster) pass `utils.checkClientIp` before the handler [model] (visible in `server.js` route registration).
- Routes that depend on WOPI are gated by `checkWopiEnable` / `checkWopiDummyEnable` [model].
- The editor data backend is chosen by config key `services.CoAuthoring.server.editorDataStorage` and loaded with `require('./' + name)` [model].

## Pitfalls
- `DocsCoServer.js` is ~4,700 lines of mixed concerns (sockets, licensing, force-save, shutdown); module-level state (`editorData`, `editorStat`, `queue`, shutdown flags) is global [model].
- `DocsCoServer.js:155` falls back to `new editorDataStorage()` (not `editorStatStorage`) when `EditorStat` is missing — looks like a copy-paste bug, may be relied upon [model].
- `package.json` `pkg.scripts` lists `./sources/editorDataRedis.js`, but no such file exists in `DocService/sources/` at this commit [model].
- Many functions use `co`/generator style alongside async/await [model].
- `canvasservice.hasAdditionalCol` is a mutable stub tied to an SQL upgrade failure [model].
- The cluster/fork code in `server.js` is commented out; scaling is assumed to be multi-process behind RabbitMQ [model].
- Four SQL dialects (`databaseConnectors/`: postgres, mysql, mssql, oracle) share `baseConnector.js` — a change must work in all [model].

## Hotspots
Nothing known (no profile or metrics computed).

## Available oracle
Jest config at `tests/jest.config.js`. Unit tests cover `utilsDocService` and Common utilities; integration tests cover `baseConnector` and forgotten-files/storage with a running server [model]. No direct tests for `DocsCoServer.js`, `canvasservice.js`, `converterservice.js` or `wopiClient.js` were found — a large gap [model].

## Open questions
- Tool-generated graph, sizes and metrics are missing; who produces `graph.json`?
- Is `editorDataRedis.js` expected from another repo/build step, or is the pkg entry dead?
- Is the `DocsCoServer.js:155` fallback intentional?
- Should `DocsCoServer.js` be mapped as its own submodule given its size?
- What exactly is `changes2forgotten.js`'s run context (standalone or imported)?

## Lessons
Nothing known yet.
