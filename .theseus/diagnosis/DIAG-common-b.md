---
id: DIAG-common-b
module: common
verdict: migrate
target_language: typescript
confidence: medium
conditional_on: "Wave 0 characterize packets for each file before that file is migrated (per-file gate); interop packet 1 (build layout) done before any file is migrated"
diagnosed_by: [claude-sonnet-5-5]
agreement: full
decided_by: null
base_commit: 83877ee
wave: 2
---

## Summary
Migrate `Common` from JavaScript to TypeScript 7 gradually, file by file, leaves first, with `allowJs` and an unchanged `module.exports` shape. The case rests on maintenance cost: `Common` is the shared contract of the whole server, and the types would document it for the 40 consumer files in DocService, FileConverter, AdminPanel and tests. The migration is gated per file: the oracle is only `partial`, and the biggest files (`utils.js`, `tenantManager.js`, `storage/*`, `taskqueueRabbitMQ.js`, `commondefines.js`) lack tests. The build layout (the `Makefile` edits two Common files in place and consumers use relative paths) is the main hidden cost. `utils.js` must be split by a `refactor` first.

This diagnosis was made independently of any other. It used only the Atlas card, the adapter, the oracle notes and the source code. It is close to a `refactor` verdict: the `migrate` choice follows the adapter's stated goal (assess a gradual JS to TS migration of `Common`) and would be downgraded under the conditions at the end.

Scoring convention: each score is 0 to 5 and says how strongly the criterion **favors acting** (migrating). Score 5 on "Coupling" means coupling is low and helps. Score 5 on "Interop cost" means interop is cheap.

## Matrix
| Criterion | Score | Weight | Evidence |
|---|---|---|---|
| Performance gain | 0 | 0.10 | No profile (`cpu_pct: null`); TypeScript compiles to the same JS, so there is no runtime gain by design. Likely costs (`pbkdf2`, stream piping) are not language-bound. |
| Security risk | 2 | 0.20 | Parses untrusted input (headers, URLs, uploads) in `utils.js` (SSRF filter, `checkPathTraversal`, JWT). Static types do not remove those flaws, but typed `unknown` at the boundary forces validation. `InputCommand` deliberately sets fields to `undefined` as a security measure, and types can encode it. Path helpers are under a separate private review, so I do not score them. |
| Maintenance cost | 4 | 0.25 | `utils.js` 1,563 lines with about 75 exports; `commondefines.js` 1,245 lines with about 25 exports and dozens of getters/setters built with `X.prototype.getY = function`; `Context` is passed as `ctx` to almost every function and is untyped. Three coding styles are mixed: `co` generators (`utils`, `tenantManager`, `taskqueueRabbitMQ`), callbacks, async/await. `new Buffer(...)` at `taskqueueRabbitMQ.js:590`. Churn: 1 commit visible in a shallow history, so `churn_90d` cannot be measured. |
| Coupling | 1 | 0.10 | Fan-in is very high. Counting `require` of `Common/sources/*` outside Common: `operationContext` 35, `utils` 29, `commondefines` 20, `tenantManager` 17, `storage-base` 13, `constants` 12, `runtimeConfigManager` 9 (40 consumer files). Inside Common: cycle `utils` → `operationContext` → `tenantManager`/`runtimeConfigManager` → `utils`/`operationContext`. A wrong export shape breaks many files. |
| Oracle strength | 2 | 0.15 | Level `partial`: 9 Jest suites, 117 tests, 2,886 lines of tests. Covered: parts of `utils`, `runtimeConfigManager`, `watchWithFallback`, `sentry`, `mailService` (excluded in the pilot oracle). No tests for `commondefines`, `formatchecker`, `tenantManager`, `storage/*`, `taskqueueRabbitMQ`, `constants`, `documentFormats`. The type checker itself becomes an extra oracle for shapes, but not for behavior. |
| Interop cost | 2 | 0.10 | See "Path of change". Consumers use relative paths (`../../Common/sources/utils`) and the `Makefile` runs `sed` in place on `Common/sources/commondefines.js` (`buildVersion`, `buildNumber`) and `license.js` (`buildDate`). Compiling to `dist/` (the adapter's suggested `outDir`) would break all of them. Jest has no TypeScript transform (`tests/jest.config.js`), so tests would need a transform or a prior build. Load-time side effects (`BigInt.prototype.toJSON`, `Date.prototype.addMonths`, `win-ca`) depend on load order. |
| Target ecosystem | 4 | 0.05 | TypeScript has mature types for the main dependencies (`config`, `log4js`, `amqplib`, `jsonwebtoken`, `nodemailer`, `@aws-sdk`, `@azure/storage-blob` and `@sentry/node` ship their own). Some are old or untyped (`co`, `node-statsd`, `uri-js-replace`, `dnscache`): they need local `declare module`. TypeScript 7 has no stable API yet, so ESLint needs the `@typescript/typescript6` alias. |
| Goal alignment | 4 | 0.05 | The adapter says: "easier to maintain and safer to change... assess a gradual JavaScript to TypeScript migration of the shared code (Common)". Directly on goal. |

Weighted score (favoring action): 0×0.10 + 2×0.20 + 4×0.25 + 1×0.10 + 2×0.15 + 2×0.10 + 4×0.05 + 4×0.05 = 0 + 0.40 + 1.00 + 0.10 + 0.30 + 0.20 + 0.20 + 0.20 = **2.40 / 5**. That is borderline: it does not clearly beat `keep` or `refactor`. I choose `migrate` only because the maintenance criterion dominates and the stated project goal asks for this assessment, so the verdict is conditional and low-risk by construction (see below). This is a lukewarm `migrate`, not a strong one.

## Discarded alternatives
- **keep:** the module works, but it is the center of the dependency graph and the card lists real maintainability problems (grab-bag `utils.js`, three async styles, cycle, untyped `ctx`). The adapter's goal asks for exactly this module to be assessed. A pure `keep` would ignore that goal.
- **refactor only (same language):** this is the closest competitor. Splitting `utils.js` and breaking the cycle gives most of the benefit and needs no build change. I include it as a mandatory first step in the plan, not as the whole answer. It does not give the consumers typed `ctx`, config paths or `InputCommand` shapes. If the interop cost turns out higher than expected, downgrade to this (see below).
- **rewrite:** nothing in `Common` is so broken that only the external contract is worth keeping, and the oracle is too thin to prove equivalence (D1).
- **retire:** not dead code, with the possible exception of the ActiveMQ transport. `activeMQCore.js` (96 lines) is required by `taskqueueRabbitMQ.js` and `DocService/sources/pubsubRabbitMQ.js` and chosen by `queue.type`; whether any supported deployment uses it is an open question in the card. An `investigate` packet is cheap and can shrink the migration.

## Path of change
Mechanism: in-process, gradual, same Node.js process, as in `.theseus/adapter/interop-javascript-typescript.md`: TypeScript 7 with `allowJs: true`, `checkJs: false`, CommonJS output, each migrated `foo.ts` keeping the exact `module.exports` shape of `foo.js`.

Points that differ from the adapter's recommended `tsconfig` for `Common`:
1. **Output location.** The adapter proposes `outDir: dist`, `rootDir: sources`. That breaks the `require('../../Common/sources/x')` paths used by about 40 files and the `Makefile` `cp`/`sed` steps. Decide first between (a) emitting `.js` next to the `.ts` sources (and not committing the emitted files), or (b) changing consumers and the `Makefile` to read `dist`. The first `interop` packet must choose, prove it with the unit suite, and record it in the adapter. Anything that edits consumers is outside `Common` and needs its own packets.
2. **Build-time `sed` files.** `commondefines.js` (`buildVersion`, `buildNumber`) and `license.js` (`buildDate`) are patched in place by the `Makefile`. Migrate them last, or keep the three patched constants in a small JS file that stays JavaScript. Do not let TypeScript output change the exact text the `sed` patterns match.
3. **Jest.** The unit tests run through Jest with no TypeScript transform. The interop packet must add one (or run against emitted JS) without changing test results.
4. **Lint.** `typescript-eslint` needs the `@typescript/typescript6` alias until TypeScript 7.1.

Order, leaves first (modules with the fewest in-Common dependents): `constants`, `documentFormats`, `statsdclient`, `reporters/*`, `signing/cscOAuth`, `mailService`, `notificationService`, `activeMQCore`/`rabbitMQCore`, `moduleReloader`, `logger`; then `formatchecker`, `storage/*`, `taskqueueRabbitMQ`; then the cycle (`runtimeConfigManager`, `tenantManager`, `operationContext`); `utils` after it is split; `commondefines` and `license` last (point 2). The old JS file is removed in the same packet that adds the `.ts` file, once the unit suite and `lint:check` pass unchanged.

Do not migrate the cycle members in separate packets without first breaking the cycle: a partly loaded module returns `undefined` at load time and TypeScript will not warn about it.

## Initial packet plan
Wave 0 (foundation; no TypeScript yet):
- `investigate`: is ActiveMQ used in any supported deployment? Decides if `activeMQCore.js` is migrated or removed. Target: `.theseus/diagnosis/` or a note.
- `characterize` `Common/sources/commondefines.js` (enums, `InputCommand`, `TaskQueueData`): serialization round trips, the `undefined` security fields. Target: `tests/unit/commondefines.tests.js`.
- `characterize` `formatchecker.js` + `documentFormats.js`: id ↔ extension, signature detection. Target: `tests/unit/formatchecker.tests.js`.
- `characterize` `tenantManager.js` + `operationContext.js` (`getCfg` default fallback, `initTenantCache`): target: `tests/unit/tenantManager.tests.js`.
- `characterize` `storage/storage-fs.js` and the `storage-base` facade (S3 and Azure with fakes, if cheap): target: `tests/unit/storage.tests.js`.
- `characterize` `taskqueueRabbitMQ.js` message serialization (mock `rabbitMQCore`). Target: `tests/unit/taskqueue.tests.js`.
- Continue the existing coverage of pure helpers in `utils.js` (PKT-0002 and PKT-0004 style packets).

Wave 1 (same language):
- `refactor`: break the `utils` → `operationContext` → `tenantManager`/`runtimeConfigManager` → `utils` cycle (inject or lazy-require), no behavior change.
- `refactor`: split `utils.js` into http, url, crypto, fs, license modules re-exported from `utils.js` so the exported shape stays identical (card open question).
- `refactor` (small): replace `new Buffer`, move `co` generators to async/await in `utils`, `tenantManager`, `taskqueueRabbitMQ`. Only after their tests exist.

Wave 2 (the migration proper; this module's wave):
- `interop`: add TypeScript 7 to `Common/package.json`, `tsconfig.json`, output layout decision, Jest transform, lint, CI/`Makefile` impact; confirm options against the TypeScript 7 release notes; add the minimal example to the adapter file.
- `migrate` packets, one per leaf group in the order above, then `storage/*`, the cycle, split `utils` modules, `commondefines`/`license` last. Each depends on its wave 0 characterize packet and on the interop packet.
- `interop` (outside Common): update `Makefile`/consumers if option (b) is chosen.

Approximate size: 6 to 7 `characterize`, 1 `investigate`, 3 `refactor`, 2 `interop`, 8 to 10 `migrate` packets.

## Risks
- **Circular requires** change behavior silently if the load order changes (compiled output imports in a different order, or lazy requires). Notice: any unit suite failure or `undefined` at boot; the fix is to break the cycle before migrating those files.
- **Export shape drift** (`module.exports` vs `exports.x`; `export =` vs ES `export`). Notice: DocService or FileConverter fails at boot. Mitigation: a small test that `Object.keys(require(file))` is unchanged for each migrated file.
- **Build-time `sed`** stops matching and the version stamp silently disappears. Notice: a check on the built output (add to the interop packet).
- **Thin oracle**: TypeScript will pass while behavior changes (for example `co` to async/await). Notice: not by tests; hence the per-file characterize gate.
- **Untyped dependencies** (`co`, `node-statsd`, `uri-js-replace`) force `any` and lower the value of the types.
- **TypeScript 7 API gap**: tools that need the compiler API (ESLint, some Jest transforms) are on the `@typescript/typescript6` alias; this can lag.
- The value is hard to measure: no churn or defect baseline exists to show the migration reduced maintenance cost. Suggest a baseline (type errors found, bugs per packet) in the first `migrate` packet.

## What would change this verdict
- Downgrade to `refactor`: if the interop packet shows the output layout needs changes in more than about 10 consumer files or the packaging (`Makefile`, `pkg`), or if wave 1 (cycle break + `utils` split) captures most of the maintenance benefit, or if type checking the leaves finds almost no defects.
- Downgrade to `keep` for a file: if its characterization shows it is stable and rarely touched (once `churn_90d` is computable, below 10 and no open issues).
- Upgrade confidence to `high`: when wave 0 brings coverage of `commondefines`, `tenantManager`, `storage` and `taskqueue` to a level the Integrator accepts as `good`, and the first migrated leaf (for example `constants`) passes the whole suite and builds with the `Makefile` unchanged.
- Move to `retire` for `activeMQCore.js`: if the investigation shows no supported deployment uses ActiveMQ.
- Reassess if TypeScript 7.1 ships the programmatic API (removes the lint alias) or if upstream (Euro-Office/server) starts its own TypeScript migration (rebase cost).
- Where this verdict is expected to differ from an independent one: the choice between `refactor` and `migrate` (the weighted score of 2.40 is borderline) and the wave number.
