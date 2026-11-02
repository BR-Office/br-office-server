---
id: DIAG-common
module: common
verdict: migrate
target_language: typescript
confidence: medium
conditional_on: "PKT characterize packets of wave 0 done for each submodule before its migrate packet (commondefines/constants, formatchecker/documentFormats); interop toolchain packet done"
diagnosed_by: [claude-opus-5-5]
agreement: partial
decided_by: null
base_commit: fa53dd8
wave: 0
---

## Summary
**Partial migrate to TypeScript, leaves first; keep the infrastructure adapters in JavaScript.** Common is the typed foundation that a later DocService migration needs. Its high-fan-in data definitions (`constants`, `commondefines`) and format detection (`formatchecker`, `documentFormats`) are cheap, near-leaf and pure. Typing them serves the maintenance goal (weight 0.25). The queue transports, storage backends and observability files stay as they are (`keep` for now): they have no oracle short of running infrastructure and little to gain from types. The verdict is conditional (D1): every part to be migrated, except the `utils.js` helpers already characterized, has oracle `none` today.

## Matrix
Scale: 0–5, higher = stronger case for changing the module (for oracle and interop: higher = stronger oracle / cheaper interop).

| Criterion | Score | Weight | Evidence |
|---|---|---|---|
| Performance gain | 1 | 0.10 | No profile (`metrics.cpu_pct: null`). TS adds no runtime gain. The only likely costs are `pbkdf2` in `encryptPassword` (`utils.js:1199-1213`) and stream helpers; migrating changes neither. |
| Security risk | 3 | 0.20 | Common holds the SSRF filter (`request-filtering-agent`, `utils.js:52,277`), JWT/secret helpers, password encryption (`utils.js:1199-1247`) and parsing of untrusted bytes (`formatchecker.js:31,703,732`, signature scan over uploaded buffers). A path-handling helper is under private security review (see SECURITY note below). Types help at the `InputCommand` boundary but do not fix logic flaws. |
| Maintenance cost | 3 | 0.25 | 7,541 lines in 24 files. `utils.js` has 1,563 lines and 126 top-level functions/exports (a grab bag). `commondefines.js` has 1,245 lines of accessor classes. Styles are mixed: `co` generators (9 in `taskqueueRabbitMQ.js`, `utils.js:175,201,217,1025`, `tenantManager.js:159`), and deprecated `new Buffer` remains (`taskqueueRabbitMQ.js:590`). There is a circular require `utils → operationContext → tenantManager → utils`, and load-time patches of `BigInt.prototype` and `Date.prototype` (`utils.js:91,1311-1319`). `churn_90d` cannot be measured: the fork history is one import commit (`0567757`, 2026-10-28). |
| Coupling | 3 | 0.10 | Fan-in: 36 files in DocService, FileConverter and tests require Common. `utils` and `operationContext` are the most required (about 27 references each), then `commondefines` (about 20), `storage-base` (about 15), `constants` and `tenantManager` (about 12). High fan-in raises the value of types for callers and the risk of a shape change. The interop rule (keep the `module.exports` shape) protects callers. |
| Oracle strength | 2 | 0.15 | Card `oracle.level: partial`. Covered: 18 pure `utils` helpers plus encrypt/decrypt (`tests/unit/utils.tests.js`), request/SSRF, `watchWithFallback`, `runtimeConfigManager`, `mailService`, `reporters/sentry`. Oracle is `none` for `constants`, `commondefines`, `formatchecker`, `documentFormats`, `tenantManager`, `storage/*`, `taskqueueRabbitMQ`, `rabbitMQCore`, `activeMQCore`. |
| Interop cost | 3 | 0.10 | The mechanism is cheap: same process, `allowJs`, CommonJS output (`interop-javascript-typescript.md`). But no toolchain exists yet: no `tsconfig`, no `typescript`/`ts-jest` in `package.json`, and `tests/jest.config.js` has no `transform`. The circular requires and the `axios` path require (`utils.js:40`) make `utils`/`operationContext` hard to migrate. The leaves (`constants`, `documentFormats`; `commondefines`, `formatchecker`, `license` only need `constants`) are easy. |
| Target ecosystem | 5 | 0.05 | Mature. The main dependencies ship types (`@aws-sdk/*`, `@azure/storage-blob`, `@sentry/node`, `axios`) or have `@types/*` (`amqplib`, `jsonwebtoken`, `config`, `nodemailer`, `log4js`). |
| Goal alignment | 4 | 0.05 | The adapter goal is to "assess a gradual JavaScript to TypeScript migration of the shared code (Common)" and to "raise test coverage where it is thin". The plan does both, starting with characterization. |

Weighted score: 0.10·1 + 0.20·3 + 0.25·3 + 0.10·3 + 0.15·2 + 0.10·3 + 0.05·5 + 0.05·4 = **2.80 / 5**. That is a middle score, which is why the verdict is split by submodule and not applied to the whole package.

## Discarded alternatives
- **keep (whole package):** valid for most of the files by line count, but it gives up the stated goal. DocService (the larger target) consumes `InputCommand`, `TaskQueueData`, `constants` and `ctx` everywhere, and typing those first is the cheapest way to make a later DocService migration safe.
- **refactor (in JS only):** splitting `utils.js` and breaking the require cycle is worthwhile, but in JS it gives no checked contract for callers. Refactor appears below only as a prerequisite for `utils`, not as the verdict.
- **rewrite:** nothing justifies dropping the design. The external contract (error codes, `encryptPassword` format, `module.exports` shapes) must stay identical, and there is no oracle for most of it.
- **retire:** nothing in Common is shown to be dead. `activeMQCore.js` is a candidate (the card asks whether ActiveMQ is used), but proving it unused needs deployment knowledge, not code.

## Path of change
Interop follows `.theseus/adapter/interop-javascript-typescript.md`: in-process, `allowJs: true`, `checkJs: false`, compiled to CommonJS. Each `foo.ts` keeps the exact `module.exports` shape of `foo.js`, and unit tests run unchanged.

Decision per submodule, in graph order (leaves first):
1. **Migrate, wave 1:** `constants.js` (no internal deps), `commondefines.js` (→ constants), `documentFormats.js` (no internal deps), `formatchecker.js` (→ constants). Each one only after its characterization.
2. **Refactor then migrate, wave 2 (reassess after wave 1):** `utils.js`. First break the `utils ↔ operationContext ↔ tenantManager` cycle and split the pure helpers (already characterized) from the req/conn/network helpers, behind a `utils.js` façade that keeps every export. Then migrate the pure part.
3. **Keep in JS (no packets now):** `operationContext`, `tenantManager`, `runtimeConfigManager`, `moduleReloader` (the config core, part of the cycle; reassess after wave 2). Also `taskqueueRabbitMQ`, `rabbitMQCore`, `activeMQCore`, `storage/*`, `logger`, `reporters/*`, `statsdclient`, `mailService`, `notificationService`, `license`, `signing/cscOAuth`: thin adapters over SDKs, with no oracle short of running infrastructure.

The old `.js` file of each migrated module is removed in the same `migrate` packet, once the `.ts` file compiles to an equivalent `module.exports` and the oracle passes.

## Initial packet plan
| # | Wave | Type | Target files | Goal | Depends on |
|---|---|---|---|---|---|
| 1 | 0 | characterize | create `tests/unit/commondefines.tests.js` | Pin `constants` values that are protocol (error codes) and `InputCommand`/`TaskQueueData`/`OutputSfcData` construction from plain objects and `JSON.stringify` round-trip, including the fields forced to `undefined` (`commondefines.js:33-37`, `copyExplicit`). | — |
| 2 | 0 | characterize | create `tests/unit/formatchecker.tests.js` | Pin `getFormatFromString` ↔ `getStringFromFormat`, `documentFormats` maps, and signature detection for sample, empty and truncated buffers. | — |
| 3 | 0 | interop | `package.json`, `tests/jest.config.js`, `eslint.config.*`, create `tsconfig.json` | Add the TypeScript toolchain (`allowJs`, CommonJS, Jest transform, lint for `.ts`) and fill in the interop doc's "Minimal example". | — |
| 4 | 0 | investigate | (private) | Private security review of a path-handling helper; outcome tracked outside this public repository. | — |
| 5 | 1 | migrate | `Common/sources/constants.js` → `.ts` | First migrated leaf: typed constants, same exports. | 1, 3 |
| 6 | 1 | migrate | `Common/sources/commondefines.js` → `.ts` | Typed command/data classes, `unknown` at the untrusted input boundary. | 1, 5 |
| 7 | 1 | migrate | `Common/sources/documentFormats.js`, `formatchecker.js` → `.ts` | Typed format ids and signature detection. | 2, 5 |
| 8 | 1 | characterize | `tests/unit/utils.tests.js` | Cover the remaining pure/fake-able `utils` helpers (`getContentDisposition`, `mapAscServerErrorToOldError`, `changeOnlyOfficeUrl`, `getSecretByElem`, `getJwtHsKey`, `checkPathTraversal`, `convertLicenseInfoTo*`, `checkIpFilter`, `getBaseUrlByRequest` with fake req). | — |
| 9 | 2 | investigate | `Common/sources/utils.js`, `operationContext.js`, `tenantManager.js` (read only) | Plan how to break the require cycle and split `utils.js` behind a façade. Output: refactor/migrate packets for wave 2. | 8 |

Wave 2 packets for `utils.js` come from #9, and the summary is revisited after wave 1 (spec §6).

## Risks
- **Hidden shape change in a migrated module** (for example a class compiled differently, `this`-bound methods, or `exports.x =` reassigned later). Detection: the characterization tests in #1/#2 assert the export keys and the behavior, and the whole unit suite runs in each acceptance.
- **Toolchain friction** (Jest transform, `axios` path mapping, lint on `.ts`) slowing every packet. Detection: #3 must leave `unit.sh` and `lint:check` green with one `.ts` file present. If the cost exceeds budget, record it as friction and reassess.
- **Load-order breakage** if a migrated leaf starts importing a cycle member. Detection: only allow leaf modules in wave 1, and review imports in each migrate packet.
- **Deployments that run Common without a build step.** Detection: #3 must state how the compiled output is produced and used by DocService/FileConverter (including any packaging scripts).
- **Security fix scope creep:** any fix coming from the private review (#4) must not be done inside a migrate packet (no behavior change in `migrate`).

## What would change this verdict
- **Down to keep** for the remaining waves if #3 shows the toolchain cannot be added without changing the build/packaging of DocService/FileConverter, or if wave 1 costs exceed 2× the packet budgets.
- **Down to refactor (JS only) for `utils.js`** if #9 shows the cycle cannot be broken without changing `ctx` behavior.
- **Up to migrate for the queue/storage adapters** if integration tests for them become part of the oracle (oracle `partial` or better) and upstream churn shows them changing often.
- **Retire `activeMQCore.js`** if the maintainers confirm no supported deployment uses ActiveMQ.
- **Raise security priority** (fix before any migration) if the private review (#4) confirms an issue.
- A **divergent** second diagnosis (D3) sends the decision to a human.
