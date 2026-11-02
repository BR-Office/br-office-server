---
id: DIAG-docservice
module: docservice
verdict: migrate
target_language: typescript
confidence: medium
conditional_on: "Wave 0 done: characterize packets for wopiUtils, editorDataMemory and the DocsCoServer module-level helpers, plus the JS→TS interop packet"
diagnosed_by: [claude-opus-5-5]
agreement: divergent
decided_by: null
base_commit: c0703a9
wave: 1
---

## Summary
**Migrate the leaves to TypeScript, and keep the core as it is for now.** The verdict is `migrate` only for the small, self-contained modules: `utilsDocService`, `wopiUtils` and `editorDataMemory`. `database.js` is retired. The co-editing core (`DocsCoServer.js`, `canvasservice.js`, `converterservice.js`, `wopiClient.js`, about 8,900 lines) stays **keep**. It is characterized now and reassessed after wave 1. The main reason is maintenance cost: the core is hard to change safely. But the core has no oracle (D1) and is the center of a seven-way circular require. Changing it now would cost far more than it gives, and every file we change moves the fork further from upstream.

## Matrix
Scores run from 0 to 5. A higher score means the criterion favors changing the module. For coupling and interop cost, a high score therefore means low coupling or cheap interop. For oracle strength, a high score means a strong oracle.

| Criterion | Score | Weight | Evidence |
|---|---|---|---|
| Performance gain | 1 | 0.10 | Card: `cpu_pct` null, no profiling, no benchmark (`oracle.md` §4). TypeScript adds no runtime gain. |
| Security risk | 4 | 0.20 | Parses untrusted input on every path: socket JWT in `io.use` (`DocsCoServer.js:1820-1844`, `checkJwt` at `:1599`), command/convert endpoints (`server.js:217-222`), uploads via `multer` (`server.js:215,318`), WOPI proof signing built byte by byte (`wopiUtils.js:49-67`). The outbound SSRF guard and `checkClientIp` live in Common and are tested there (`requestSSRF.tests.js`), so the risk is in input handling, not memory. |
| Maintenance cost | 5 | 0.25 | `DocsCoServer.js` has 4,736 lines. `install` spans `:1817-4329`, about 2,500 lines of closures that cannot be required or tested. There are 65 `function*` generators in `DocsCoServer.js` and 27 in `canvasservice.js` next to `async`. `database.js` requires `mongodb` (in no `package.json`) and `./config.json` (absent). `pkg.scripts` lists `editorDataRedis.js`, which is not in the repo. The fork has one import commit, so `churn_90d` says nothing. |
| Coupling | 1 | 0.10 | Seven modules require `DocsCoServer` (`server`, `canvasservice`, `converterservice`, `gc`, `fileuploaderservice`, `changes2forgotten`, `ai/aiProxyHandler`), and it requires several of them back. DocService pulls in 18 distinct `Common/sources` modules (`commondefines` 15×, `utils` 16×, `operationContext` 15×). The leaves are better: `wopiUtils` and `utilsDocService` only depend on Common. |
| Oracle strength | 1 | 0.15 | Card `oracle.level: none`. Only `utilsDocService` has tests (18 in `tests/unit/utilsDocService.tests.js`). `DocsCoServer`, `canvasservice`, `converterservice` and `wopiClient` have none (`oracle.md` §4). The integration tests need a server and databases and are outside the oracle. |
| Interop cost | 3 | 0.10 | The adapter's in-process `allowJs` + CommonJS path fits. The cost comes from the circular requires that read exports lazily, the dynamic `require('./' + cfgEditorDataStorage)` (`DocsCoServer.js:100-101`), and the `pkg` bundle and `bin` entries pointing at `sources/*.js` (`DocService/package.json`). |
| Target ecosystem | 4 | 0.05 | TypeScript is mature, and express, socket.io, jsonwebtoken, multer and pg all ship types. `co` generators type poorly (they yield `any`). |
| Goal alignment | 4 | 0.05 | The adapter's goal names DocService explicitly: "assess a gradual JavaScript to TypeScript migration … and raise test coverage where it is thin". |

Weighted total: 0.10 + 0.80 + 1.25 + 0.10 + 0.15 + 0.30 + 0.20 + 0.20 = **3.10 / 5**. The pressure to change is real (maintenance and security), but the oracle and coupling scores block any change to the core. The matrix alone would suggest migrating the whole package. I go against it for the core, for the reasons under "Discarded alternatives".

## Discarded alternatives
- **keep (whole package):** maintenance cost, the heaviest weight, scores 5. The adapter's goal asks for coverage and a TypeScript assessment of DocService. If we do nothing, the core stays impossible to change safely.
- **migrate (whole package, core included):** blocked by D1 (oracle `none`). Converting `install` as it stands would mean typing 2,500 lines of closures with `any`, which is little gain for a large divergence from upstream. Types do not fix the real problem in the core, which is its structure.
- **refactor the core now (lift the `install` closures, remove the circular requires):** this is the right long-term direction, but it needs an oracle first, and it rewrites the file upstream changes most often. The fork must stay easy to sync (`conventions.md`, `upstream.sync_every: 7d`). This is deferred to the reassessment after wave 1, using what the investigate packet (P8) finds.
- **rewrite:** the external contract is the socket.io protocol with browser editors we do not own, the command service API and the WOPI host API. There is no oracle for any of them. The risk is unjustified.
- **retire:** applies only to `database.js` (see the plan), not to the package.

## Path of change
The interop mechanism is the one in `.theseus/adapter/interop-javascript-typescript.md`: TypeScript with `allowJs`, compiled to CommonJS, with each `foo.ts` exporting exactly the `module.exports` shape of `foo.js`. Decisions by submodule:

| Submodule | Decision | Why |
|---|---|---|
| `utilsDocService.js` | migrate (the interop example) | Already has 18 tests, depends only on Common. |
| `wopiUtils.js` | migrate after characterize | Pure byte layout plus security-relevant headers, depends only on Common. |
| `editorDataMemory.js` | migrate after characterize | Typing it defines the `EditorData`/`EditorStat` interface that other backends (Redis, outside the repo) must meet. |
| `database.js` | retire | Cannot load: it needs `mongodb` and `./config.json`, and no file requires it. |
| `DocsCoServer.js`, `canvasservice.js`, `converterservice.js`, `wopiClient.js` | keep, characterize only | No oracle, central to the circular requires. Reassess after wave 1. |
| `databaseConnectors/*`, `taskresult.js`, `pubsubRabbitMQ.js`, `gc.js`, `server.js`, `routes/*`, `shutdown.js`, `changes2forgotten.js`, `fileuploaderservice.js`, `ai/*` | keep | Adapters to external systems (databases, RabbitMQ) or entry scripts. Low gain, and only integration tests can prove them. |

Order: leaves first, never the core in this verdict. A `.js` file is deleted in the same `migrate` packet that adds its `.ts`, once the unit tests pass unchanged. The `pkg` and `bin` entries must keep resolving to runnable JavaScript.

## Initial packet plan
| # | Wave | Type | Target files | Goal | Depends on |
|---|---|---|---|---|---|
| P1 | 0 | characterize | create `tests/unit/wopiUtils.tests.js` | Pin `fillStandardHeaders` and `getWopiFileUrl`: the URL precedence (FileUrl, then TemplateSource, then wopiSrc), the header set, and the proof buffer layout checked against a fixed test RSA key. | none |
| P2 | 0 | characterize | create `tests/unit/editorDataMemory.tests.js` | Pin presence, locks, messages, force-save and `EditorStat` counters of the in-memory backend. | none |
| P3 | 0 | characterize | create `tests/unit/docsCoServerHelpers.tests.js` | Pin the exported module-level helpers of `DocsCoServer.js` (`checkJwt`, `checkJwtHeader`, `getRequestParams`, `getOpenFormatByEditor`, `encryptPasswordParams`) with config and storage mocked. If the module cannot load without a database, record that and stop. | none |
| P4 | 0 | interop | `tsconfig.json`, root `package.json`, `.theseus/oracle/unit.sh`, `DocService/sources/utilsDocService.js` → `.ts` | Add the TypeScript toolchain (`allowJs`, CommonJS, Jest able to load `.ts`) and migrate `utilsDocService` as the minimal example. Complete the example in the interop doc. Share one toolchain with Common's interop packet if it has one. | none |
| P5 | 1 | migrate | `DocService/sources/wopiUtils.js` → `.ts` | Same exports, strict types inside, `unknown` at the `ctx`/`fileInfo` boundary. | P1, P4 |
| P6 | 1 | migrate | `DocService/sources/editorDataMemory.js` → `.ts` | Same exports. Extract `EditorData`/`EditorStat` interfaces for other backends. | P2, P4 |
| P7 | 1 | investigate | `DocService/sources/database.js` | Confirm that `database.js` is unused and cannot load, then remove it. Also check why `pkg.scripts` lists the absent `editorDataRedis.js`. | none |
| P8 | 1 | investigate | none (report only) | Map which `install` closures (`DocsCoServer.js:1817-4329`) could be lifted with no change in behavior, and measure upstream churn per file. Feeds the reassessment of the core. | P3 |

## Risks
- **Upstream divergence:** every file moved to `.ts` stops taking upstream patches cleanly. We will notice when the weekly upstream sync conflicts on a migrated file. That is why the plan only migrates three small leaves.
- **Toolchain breaks production entry points** (`pkg`, `bin`, `node sources/server.js`). We will notice when the server fails to start, or when a `require` of a `.ts` file has no compiled output. P4 must prove that the server still boots, not only that the tests pass.
- **A characterization pins mocks rather than real behavior** (P3 in particular, because of module-level side effects at load). The reviewer checks that the assertions read real output.
- **Latent fallback bug:** `DocsCoServer.js:155` creates `new editorDataStorage()` for `editorStat` when a backend lacks `EditorStat`. Today it is dead for the bundled backend. A migration that changes the export shape could bring it back to life.

## What would change this verdict
- **To refactor the core:** P8 shows that most `install` closures can be lifted mechanically, and upstream churn on `DocsCoServer.js` is low (say, fewer than 5 upstream commits per quarter). Then plan characterize, then refactor for the core.
- **To migrate the core:** after that refactor, the core has a `partial` oracle and the leaf migrations (P5, P6) passed review on the first attempt with no upstream sync conflicts.
- **To keep the whole package:** P4 shows that the TypeScript toolchain cannot coexist with `pkg` and the `bin` entries without a build step we do not want, or the first upstream sync after P5 or P6 costs more than the migration saved.
- **Higher security score:** a CVE or bug report in socket message handling or WOPI. Characterization of those paths then moves ahead of the migrations.
