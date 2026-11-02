---
id: DIAG-common
module: common
verdict: refactor
target_language: null
confidence: medium
conditional_on: null
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
base_commit: 20066c5
wave: 0
---

## Summary
**Refactor** (in JavaScript, with type checking added gradually through JSDoc and `// @ts-check`). Common is the most coupled code in the server (27 files in DocService/FileConverter require it) and its riskiest parts — tenant resolution, `operationContext`, storage key building, task queues — have no unit tests. The first need is an oracle for those parts, then small structural fixes; a full TypeScript migration is not justified yet and would require a double diagnosis (D3).

## Matrix
| Criterion | Score | Weight | Evidence |
|---|---|---|---|
| Performance gain | 1 | 0.10 | No profile (`metrics.cpu_pct: null`); Common is config/glue code, no known hotspot. |
| Security risk | 4 | 0.20 | `utils.js` does downloads with SSRF filtering and JWT helpers; `tenantManager.js` derives tenant from the Host header; storage keys must isolate tenants (card invariants). |
| Maintenance cost | 4 | 0.25 | `utils.js` 1,563 lines of mixed concerns, `commondefines.js` 1,245 lines; circular requires `utils` ↔ `operationContext` ↔ `tenantManager`; module-load `cfg*` constants ignore tenant overrides (card pitfalls). Churn unusable: history restarted (1 commit touches `Common`). |
| Coupling | 5 | 0.10 | Used by DocService, FileConverter, AdminPanel, SpellChecker; 27 source files in DocService+FileConverter reference `Common/sources`; `Context.toJSON()` is a cross-service wire format. |
| Oracle strength | 2 | 0.15 | `oracle.level: partial`; `tests/unit` covers utils, request/SSRF, runtimeConfigManager, Sentry, mail, watcher; nothing for tenantManager, operationContext, storage, taskqueue. |
| Interop cost | 2 | 0.10 | For JS→TS: high fan-in and circular requires make a mixed build risky; `@ts-check`+JSDoc has near-zero interop cost. |
| Target ecosystem | 4 | 0.05 | TypeScript is allowed (`allowed_targets.javascript: [typescript]`) and mature. |
| Goal alignment | 4 | 0.05 | Goal: "easier to maintain and safer to change... raise test coverage where it is thin, assess a gradual JS→TS migration of Common". |

Weighted score for change ≈ 3.2/5: change is warranted, but low oracle strength argues for characterize-then-refactor rather than migrate.

## Discarded alternatives
- **keep:** thin coverage on security-relevant, highly coupled code contradicts the project goal.
- **migrate (TypeScript):** D1 is formally met (oracle `partial`), but the uncovered parts are exactly what a migration would touch, and circular requires plus 27+ consumers make the build transition costly. Revisit after wave 1 (see below); `@ts-check` gets most of the type-safety benefit without a build change.
- **rewrite:** the external contract (config schema, `Context` wire format, storage keys) is good; the problem is structure and tests.
- **retire:** everything is in use.

## Path of change
1. Wave 0: characterize `tenantManager`, `operationContext` and `storage-base` (fs backend) with unit tests that need no live service.
2. Wave 1: enable `// @ts-check` with JSDoc on the DTOs (`commondefines.js`) and `operationContext.js`; break the `utils` ↔ `operationContext` cycle by moving request-extraction helpers out of `utils.js`.
Later waves (split `utils.js`, task-queue tests) are planned after wave 1 is reviewed.

## Initial packet plan
| Key | Wave | Type | Title |
|---|---|---|---|
| P1 | 0 | characterize | Characterize tenantManager |
| P2 | 0 | characterize | Characterize operationContext |
| P3 | 0 | characterize | Characterize storage-base with the fs backend |
| P4 | 1 | refactor | Type-check commondefines and operationContext with JSDoc |
| P5 | 1 | refactor | Break the utils ↔ operationContext require cycle |

```yaml
packets:
  - key: P1
    wave: 0
    type: characterize
    title: Characterize Common tenantManager
    files: []
    create_in: [tests/unit]
    depends_on: []
    goal: Pin tenant resolution from host (a.<baseDomain> → a, otherwise full domain), default tenant, multitenant flag and tenant config/secret lookup with unit tests that need no live service.
    context: Common/sources/tenantManager.js; see the common card pitfalls. Run with .theseus/oracle/unit.sh.
  - key: P2
    wave: 0
    type: characterize
    title: Characterize Common operationContext
    files: []
    create_in: [tests/unit]
    depends_on: []
    goal: Pin Context.toJSON()/initFromTaskQueueData round-trip (cross-service wire format), initFromRequest and getCfg precedence (tenant over runtime over base).
    context: Common/sources/operationContext.js; invariants in .theseus/atlas/common.md.
  - key: P3
    wave: 0
    type: characterize
    title: Characterize Common storage-base with the fs backend
    files: []
    create_in: [tests/unit]
    depends_on: []
    goal: Pin storage key building (<specialDir>/<tenantPrefix><path>, backslash normalisation, tenant isolation) and persistentStorage inheritance using storage-fs in a temp dir.
    context: Common/sources/storage/storage-base.js and storage-fs.js.
  - key: P4
    wave: 1
    type: refactor
    title: Type-check Common commondefines and operationContext with JSDoc
    files: [Common/sources/commondefines.js, Common/sources/operationContext.js]
    create_in: []
    depends_on: [P2]
    goal: Add // @ts-check and JSDoc types without behavior change; type errors found become notes or new packets.
    context: Gradual TypeScript assessment requested by the adapter goals; no build change.
  - key: P5
    wave: 1
    type: refactor
    title: Break the utils / operationContext require cycle in Common
    files: [Common/sources/utils.js, Common/sources/operationContext.js]
    create_in: [Common/sources]
    depends_on: [P1, P2]
    goal: Move request/shard/WOPI extraction helpers out of utils.js into a new module so operationContext no longer depends on utils circularly; keep utils exports as re-exports.
    context: Circular requires are listed in the common card pitfalls.
```

## Risks
- Characterization tests may need config/env setup that couples them to `config` package loading order; noticed as flaky or order-dependent tests.
- Moving helpers out of `utils.js` can break consumers that require them by path; mitigated by re-exports and the unit oracle plus `npm run lint:check`.

## What would change this verdict
- If wave 0 brings oracle to `good` and `@ts-check` finds many real type bugs, reassess as **migrate** to TypeScript (with double diagnosis, D3).
- If a profile shows Common above 5% CPU, raise performance gain and reconsider.
- If the uncovered parts turn out to be stable and rarely changed upstream (churn after `sync_every`), downgrade wave 1 and consider **keep** after characterization.
