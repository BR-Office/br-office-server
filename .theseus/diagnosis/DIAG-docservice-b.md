---
id: DIAG-docservice-b
module: docservice
verdict: migrate
target_language: typescript
confidence: medium
conditional_on: "characterize packets for DocsCoServer, canvasservice, wopiClient and converterservice done (oracle is level none today, rule D1)"
diagnosed_by: [claude-sonnet-5-5]
agreement: divergent
decided_by: null
base_commit: ea6eee6
wave: 2
---

## Summary
`DocService` is worth migrating to TypeScript 7, gradually and file by file, but only after a `characterize` wave, because its oracle is `none` (D1). The main reason is maintenance cost: one 4,736-line file with closures inside `install`, six circular requires and mixed `co`/`async` styles. Types help most at the module boundaries. The tests and a small same-language refactor of `DocsCoServer.js` must come first. This is an independent diagnosis, written only from the Atlas card, the adapter, the oracle notes and the source.

## Matrix
Scores are 0 to 5, and a higher score always means a stronger case for migrating. For oracle strength and interop cost, 5 means cheap or well covered.

| Criterion | Score | Weight | Evidence |
|---|---|---|---|
| Performance gain | 1 | 0.10 | No profiling data (card `cpu_pct: null`). TypeScript compiles to the same JS, so no gain is expected. |
| Security risk | 3 | 0.20 | Handles untrusted input: socket.io `auth`/`message` payloads, JWT (`checkJwt`), WOPI headers and bodies, download/upload endpoints. No manual memory. Types help a little, but they do not validate at runtime. |
| Maintenance cost | 5 | 0.25 | 14,706 lines in `DocService/sources`. `DocsCoServer.js` has 4,736 lines, about 327 `function*`/`yield` and 96 `async`/`await` uses, and module-level mutable state (`connections`, `pubsub`, `queue`, `shutdownFlag`, `preStopFlag`, `pubsubOnMessage`). `canvasservice.js` has 2,106 lines and 162 generator uses. |
| Coupling | 4 | 0.10 | `DocsCoServer` requires `canvasservice`, `converterservice`, `gc`, `wopiClient`, `shutdown`, `pubsubRabbitMQ` and `ai/aiProxyHandler`, and several of these require it back (`gc`, `fileuploaderservice`, `aiProxyHandler`). Outside users: `FileConverter/sources/converter.js` (baseConnector, wopiUtils, taskresult), `AdminPanel/server/sources/server.js` (routes/info), `Common/sources/notificationService.js` (dynamic `require('./../../DocService/sources/' + cfg)`) and `tests/perf/checkFileExpire.js`. |
| Oracle strength | 1 | 0.15 | Level `none`. Only `utilsDocService.js` is unit tested (`tests/unit/utilsDocService.tests.js`, 289 lines). The other four large files have no tests. The integration tests (`tests/integration/`) need a server and databases. |
| Interop cost | 3 | 0.10 | Good: CommonJS with `allowJs` works, and `module.exports` shapes can stay unchanged. Bad: dynamic `require('./' + cfgEditorDataStorage)` in `DocsCoServer.js:100-101`, lazily read circular exports, and `FileConverter/package.json` `pkg.scripts` plus the cross-package relative requires point at `DocService/sources/*.js`. Compiling to `dist` would break them, so output must stay next to the source or those paths must be updated. |
| Target ecosystem | 4 | 0.05 | Types exist for express, socket.io, jsonwebtoken, `co`, `underscore` and `ms`. `config.get` is loosely typed (interop doc pitfall). `typescript-eslint` needs the `@typescript/typescript6` alias until TypeScript 7.1. |
| Goal alignment | 5 | 0.05 | The adapter statement names DocService as a migration candidate and asks for an easier-to-change, safer codebase. |

Weighted total: 0.10 + 0.60 + 1.25 + 0.40 + 0.15 + 0.30 + 0.20 + 0.25 = **3.25 / 5**. That is moderate-to-high, and it is held back by the weak oracle.

## Discarded alternatives
- **keep:** rejected. The structural hotspot is real (size, coupling, closures) and the project goal is explicitly to make the code easier to change. Keeping would leave DocService as the riskiest file to touch.
- **refactor only (same language):** a refactor is needed first for `DocsCoServer.js` (lift `install` closures to module level), and that is part of this plan. As a final state it is not enough, because the weak spots are untyped shapes crossing module boundaries (connection objects, `ctx`, task rows, callback payloads), which only types can document and check.
- **rewrite:** rejected. There is no oracle, behavior is subtle (save ordering, locks, timers) and it would be hard to undo. The contract must stay byte-for-byte.
- **retire:** only `database.js` (126 lines, reads `./config.json`, no callers found) is a candidate. That is a small `investigate` packet, not a module verdict.
- **migrate now:** rejected by D1, because there are no tests to prove equivalence.

## Path of change
Mechanism: the in-process gradual route from `.theseus/adapter/interop-javascript-typescript.md` (TypeScript 7, `allowJs: true`, `checkJs: false`, CommonJS output, `module.exports` shape preserved). Before the first migrated file:
1. Decide where compiled output lives. The other packages require `DocService/sources/...` by relative path (see Coupling), so in-place emit or an updated `pkg` list is needed. This must be resolved in the interop packet.
2. Characterize the unit-testable surface. `DocsCoServer` already exports pure or near-pure helpers (`parseUrl`, `parseReplyData`, `getCallback`, `checkJwt`, `signToken`, `modifyConnectionForPassword`, `changeConnectionInfo`). `canvasservice` exports `getPrintFileUrl`, `commandPathUrls`, `OutputData`/`OutputDataWrap`. `wopiClient` exports `checkIpFilter`, `parseWopiCallback`, `parsePutFileResponse`, `getFileTypeByInfo`, `isWopiJwtToken`. `editorDataMemory` and `taskresult` are testable with fakes.
3. Migrate from the leaves of the module graph toward `DocsCoServer`:
   - Leaves: `utilsDocService`, `wopiUtils`, `databaseConnectors/*`, `taskresult`, `editorDataMemory`, `routes/*`, `shutdown`.
   - Middle: `pubsubRabbitMQ`, `fileuploaderservice`, `gc`, `converterservice`, `wopiClient`, `ai/aiProxyHandler`.
   - Center: `canvasservice`, then `DocsCoServer`, then `server.js`.
4. Convert `co` generators to `async/await` in separate `refactor` packets, not inside `migrate` packets (a migrate packet must not change behavior).
5. Never require `changes2forgotten.js` from the server (it calls `process.exit`), and migrate it last or leave it as JS.
6. The old `.js` of a file is removed in the same packet that adds its `.ts`, only when all unit tests pass unchanged.

## Initial packet plan
Wave 0, foundation (before any migrate packet):
- W0-1 `interop`: add TypeScript 7 and `tsconfig.json` to `DocService`, settle where output goes. Targets: `DocService/package.json`, `DocService/tsconfig.json`, `.theseus/adapter/interop-javascript-typescript.md`, `FileConverter/package.json` (pkg paths if needed).
- W0-2 `characterize` `DocsCoServer` exported helpers. Create in `tests/unit/` (`docsCoServer.tests.js`).
- W0-3 `characterize` `canvasservice`: URL/output builders and exported helpers. Create `tests/unit/canvasservice.tests.js`.
- W0-4 `characterize` `wopiClient`/`wopiUtils`. Create `tests/unit/wopiClient.tests.js`.
- W0-5 `characterize` `converterservice` parameter parsing. Create `tests/unit/converterservice.tests.js`.
- W0-6 `characterize` `editorDataMemory`, `taskresult`. Create `tests/unit/editorDataMemory.tests.js`.
- W0-7 `investigate`: is `database.js` dead? Also, `editorDataRedis.js` is referenced in two `pkg` lists but not in this repo. Which backend runs in production?

Wave 1 (parallelizable, after W0-1): `migrate` leaves, one packet each: `utilsDocService.js`, `wopiUtils.js`, `taskresult.js`, `editorDataMemory.js`, `shutdown.js`, `databaseConnectors/*.js` (one packet per connector), `routes/*.js`. Targets are the file named plus its `.ts` successor.

Wave 2 (needs W0-2 to W0-6):
- `refactor` `DocsCoServer.js`: lift `install` closures to module level, in small steps (locks, changes, save, pubsub, commands), with the tests from W0-2 kept green.
- `refactor`: convert `co` generators to `async/await` in the middle modules, one module per packet.
- `migrate` middle modules: `pubsubRabbitMQ`, `fileuploaderservice`, `gc`, `converterservice`, `wopiClient`, `ai/aiProxyHandler`.

Wave 3 (center): `migrate` `canvasservice.js`, `DocsCoServer.js` (split first), `server.js`. Reassess before starting.

## Risks
- Circular requires: converting to `import`/`export` would change load order. Keep `require` and lazy reads. Notice by startup failure or `undefined` exports in unit tests.
- Dynamic requires and `pkg` paths break silently in the packaged binary. Notice by a packaging check in the interop packet.
- Characterization tests that pin current behavior may also pin bugs. Mark such tests as observed, not intended.
- Generators to `async/await` can change microtask ordering around timers and locks. Do this only with tests, and never inside a `migrate` packet.
- Untyped `config.get(...)` reads and `ctx` shapes make early types shallow, so the real gain may be smaller than expected.
- No performance benchmark, so a regression cannot be proven or excluded.

## What would change this verdict
- To **refactor**: if the characterize wave shows `DocsCoServer` cannot be tested without a server and databases (so the oracle stays `none`), or if the compiled-output location cannot be solved without breaking FileConverter/AdminPanel/Common consumers.
- To **keep**: if the goal shifts away from maintainability, or the first 3 to 4 migrated leaves show no measurable gain in review time or defects.
- To **rewrite or a larger split**: if the `DocsCoServer` lift of closures proves the file cannot be decomposed without behavior changes.
- Upwards (migrate sooner, smaller wave 0): if the integration tests (`tests/integration/`) get a CI-run server so they can serve as the oracle.
