---
id: DIAG-docservice
module: docservice
verdict: refactor
target_language: null
confidence: medium
conditional_on: "characterization packets P1-P3 done before any structural refactor of DocsCoServer.js / canvasservice.js"
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
base_commit: 32d3256
wave: 0
---

## Summary
**Refactor**, preceded by characterization. DocService is ~14.7k lines of JavaScript whose two central files (`DocsCoServer.js` 4,736 lines, `canvasservice.js` 2,106 lines) concentrate most of the risk and have no direct tests. The adapter goal is "easier to maintain and safer to change"; that is best served now by pinning behavior with tests and splitting the god-file, not by a JS→TS migration, which on untested code would be a large unprovable change (rule D1 in spirit: the oracle is `partial` only for the edges, `none` for the core).

## Matrix
| Criterion | Score | Weight | Evidence |
|---|---|---|---|
| Performance gain | 1 | 0.10 | No profile or `metrics` on the card ("Hotspots: nothing known"); service is I/O-bound (RabbitMQ, DB, storage) per card main flow. |
| Security risk | 3 | 0.20 | Parses untrusted input: JWT checks in socket handlers, `/upload/:docid*` (`fileuploaderservice.js`), `/ai-proxy` (`ai/aiProxyHandler.js`), WOPI host calls (`wopiClient.js` 1,250 lines). JS is memory-safe; risk is logic/auth, which refactor + tests address; TS would only marginally help. |
| Maintenance cost | 5 | 0.25 | `DocsCoServer.js` 4,736 lines of mixed concerns with global module state (card Pitfalls); 65 `co`/generator usages mixed with async/await in that file; suspicious fallback at `DocsCoServer.js:154` (`new editorDataStorage()` for EditorStat). `churn_90d` not usable: history restarted from upstream (one commit per file). |
| Coupling | 3 | 0.10 | No `graph.json`. From code: depends heavily on `Common` (config, storage, queues, tenants); fan-in is only external (clients, FileConverter via queues). Four SQL dialects share `baseConnector.js`. |
| Oracle strength | 2 | 0.15 | Card oracle `partial`: only `utilsDocService` unit tests and DB/storage integration tests; no tests for `DocsCoServer.js`, `canvasservice.js`, `converterservice.js`, `wopiClient.js`. |
| Interop cost | 4 (low cost) | 0.10 | A refactor stays in JS: no interop needed. A TS migration would also be cheap per file (`allowJs`), so this does not discriminate much. |
| Target ecosystem | 4 | 0.05 | TypeScript is mature and allowed by the adapter; relevant only if migrate is reconsidered. |
| Goal alignment | 5 | 0.05 | Adapter statement names DocService explicitly and prioritizes "raise test coverage where it is thin". |

Weighted reading: the dominant weights (maintenance 0.25, security 0.20, oracle 0.15) point to "change this module, but carefully": high pain, weak proof. That is refactor-after-characterize.

## Discarded alternatives
- **keep**: the maintenance score (god-file, global state, mixed async styles, likely bug at line 154) is too high for a module the adapter explicitly wants safer to change.
- **migrate (TypeScript)**: the adapter asks to *assess* it. Not now: the core files have no oracle, so equivalence cannot be shown, and converting a 4.7k-line file with module-level mutable state gives types but not structure. Reassess after the split: small, tested modules can then be migrated leaf-first cheaply (could start with `utilsDocService.js`, `wopiUtils.js`, `routes/*`). Would also require the double diagnosis (D3).
- **rewrite**: the external contract (socket.io protocol with the editors, CommandService/ConvertService APIs, WOPI) is large, poorly specified and shared with client code outside this repo. A rewrite risks protocol drift with no oracle.
- **retire**: the module is the server core. Only fragments look dead (`pkg.scripts` entry `./sources/editorDataRedis.js` which does not exist) — handled by an investigate packet.

## Path of change
Not migrate/rewrite. Order for the refactor:
1. Characterize (wave 0): HTTP endpoint tests via supertest-style requests on `server.js` routes with mocked Common queues/DB; unit tests for `canvasservice` command dispatch; WOPI client request building.
2. Investigate the two open oddities (line-154 fallback, missing `editorDataRedis.js`).
3. Refactor (wave 1): extract cohesive pieces out of `DocsCoServer.js` (license checks, force-save, shutdown/cluster handling, command handling) into separate files behind the same exports; replace `co` generators with async/await file by file.
4. Reassess the TS migration once the split modules are tested.

## Initial packet plan
| Key | Wave | Type | Title |
|---|---|---|---|
| P1 | 0 | characterize | Characterize DocService HTTP command/convert endpoints |
| P2 | 0 | characterize | Characterize canvasservice command handling |
| P3 | 0 | characterize | Characterize wopiClient request building and lock flow |
| P4 | 0 | investigate | Investigate EditorStat fallback and missing editorDataRedis.js |
| P5 | 1 | refactor | Extract force-save and shutdown logic from DocsCoServer.js |
| P6 | 1 | refactor | Replace co/generator style with async/await in DocsCoServer.js |

```yaml
packets:
  - key: P1
    wave: 0
    type: characterize
    title: Characterize DocService HTTP command and convert endpoints
    files: []
    create_in: [tests/unit/docservice]
    depends_on: []
    goal: Pin the current responses of /coauthoring/CommandService.ashx, /command, /ConvertService.ashx, /converter and /healthcheck (status codes, error codes, JWT and checkClientIp rejection) with jest tests that mock the Common queue, storage and database layers.
    context: Routes are registered in DocService/sources/server.js; handlers live in DocsCoServer.js (commandFromServer, healthCheck) and converterservice.js (convertXml, convertJson). Jest config is tests/jest.config.js.
  - key: P2
    wave: 0
    type: characterize
    title: Characterize canvasservice command handling
    files: []
    create_in: [tests/unit/docservice]
    depends_on: []
    goal: Pin the behavior of canvasservice openDocument, receiveTask and saveFromChanges status transitions (taskresult statuses, queued tasks) with mocked taskresult, storage and queue.
    context: DocService/sources/canvasservice.js (2,106 lines) and taskresult.js have no direct tests.
  - key: P3
    wave: 0
    type: characterize
    title: Characterize wopiClient request building and lock flow
    files: []
    create_in: [tests/unit/docservice]
    depends_on: []
    goal: Pin the headers, proof keys, URLs and error handling of wopiClient lock, unlock, putFile and checkFileInfo with a mocked HTTP layer.
    context: DocService/sources/wopiClient.js and wopiUtils.js; discovery is served at /hosting/discovery.
  - key: P4
    wave: 0
    type: investigate
    title: Investigate EditorStat fallback and missing editorDataRedis.js
    files: []
    create_in: [.theseus/investigations]
    depends_on: []
    goal: Decide whether DocsCoServer.js:154 (new editorDataStorage() used as EditorStat fallback) is a bug or relied upon, and whether the DocService package.json pkg.scripts entry ./sources/editorDataRedis.js is dead; propose follow-up packets.
    context: Card pitfalls in .theseus/atlas/docservice.md; check upstream Euro-Office/server and ONLYOFFICE history.
  - key: P5
    wave: 1
    type: refactor
    title: Extract force-save and shutdown logic from DocsCoServer.js
    files: [DocService/sources/DocsCoServer.js]
    create_in: [DocService/sources/coauthoring]
    depends_on: [P1, P2]
    goal: Move force-save and shutdown/preStop handling into separate modules without changing exported functions or behavior; the characterization tests must pass unchanged.
    context: DocsCoServer.js mixes sockets, licensing, force-save and shutdown with global module state (editorData, editorStat, queue, shutdown flags).
  - key: P6
    wave: 1
    type: refactor
    title: Replace co/generator style with async/await in DocsCoServer.js
    files: [DocService/sources/DocsCoServer.js]
    create_in: []
    depends_on: [P1, P5]
    goal: Convert the co(function*) usages in DocsCoServer.js to async/await with identical error propagation; characterization tests must pass unchanged.
    context: About 65 co/generator occurrences in the file.
```

## Risks
- Characterization with heavy mocking may pin mock behavior rather than real behavior; mitigated by keeping the existing integration tests (`tests/integration/withServerInstance`) green.
- The socket.io editor protocol is not covered by P1–P3; refactors touching socket handlers must wait for a dedicated characterize packet (to plan in wave 1 review).
- Global module state in `DocsCoServer.js` makes extraction order-sensitive (initialization in `install`).

## What would change this verdict
- If P1–P3 reach good coverage and the split (P5) is done cleanly, reconsider **migrate to TypeScript** leaf-first (requires double diagnosis, D3).
- If profiling shows DocService above the adapter's hotspot threshold (`cpu_pct >= 5`), add performance refactors.
- If upstream (Euro-Office/server) plans its own restructuring of `DocsCoServer.js`, downgrade to **keep** plus characterization only, to avoid merge conflicts with the 7-day upstream sync.
