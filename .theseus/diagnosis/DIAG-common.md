---
id: DIAG-common
module: common
verdict: keep
target_language: null
confidence: medium
conditional_on: "P1 (measure Common's share of server request cost) confirms it stays below the thresholds in 'What would change this verdict'"
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: 5ad1b11
wave: 0
---

## Summary
**Keep.** The goal is speed and quality that users feel. The baseline puts user-visible time in the client (open ≈ 3.4–4.4 s, mostly scripts and render) and in x2t (PDF export 0.6–6.5 s), not in the Node server. Common is the library under that server. No measurement shows a user-visible cost in Common, and its defect history is lower than DocService's. A refactor or a language change of Common would cost risk and gain nothing measurable. One measurement packet closes the only gap: Common's share of server time has never been isolated.

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Goal: speed | The whole server is a small part of what users wait for. Co-edit server segment (receive → broadcast) is 4 ms p50 / ≤ 70 ms p99 and does not grow with clients. DocService used 0.28 core at 1 771 broadcasts/s. Conversion service overhead is ≈ 55–95 ms against x2t's 70–90 % share. Common's in-process hot paths (`formatchecker`) run in 0.2–0.9 µs. | baseline.md: PKT-0018 split and load test, PKT-0015 ConvertService, micro-benchmarks |
| Goal: speed, latent delays in Common | `TaskQueueRabbitMQ.closeOrWait` sleeps 1 000 ms for ActiveMQ (`//todo remove sleep`), but only at shutdown. The sync-convert +900 ms delay is in DocService (`converterservice.js` `CONVERT_ASYNC_DELAY`), not in Common. | `Common/sources/taskqueueRabbitMQ.js:630-639`; baseline.md PKT-0015 |
| Goal: quality | `Common/` has 259 fix commits out of 904 (29 %) and 4 crash fixes. `DocService/` has 421/1 115 and 13. Fixes in Common are concentrated in `utils.js` (66/203) and `config/default.json` (79/322, configuration, not code). The crash fixes that users saw are null guards in DocService/FileConverter. | baseline.md PKT-0017 "Where fixes concentrate" |
| Quality and security risk | `utils.js` (1 563 lines) mixes SSRF-filtered downloads, JWT and request parsing. It is the main structural risk in Common, but it is already covered by the unit oracle (`utils`, `request`, `requestSSRF` tests). Untested: storage backends, task queues, `tenantManager`, `operationContext` (one test file only). | `wc -l Common/sources/*.js`; `tests/unit/`; atlas card "Available oracle" |
| Oracle (D1) | `partial`. This would allow migrate, but nothing measurable justifies one. | atlas card `oracle.level` |
| Coupling and interop | Every service requires Common (DocService, FileConverter, AdminPanel, SpellChecker). `Context.toJSON()` is the wire format across queues. There are circular requires `utils` ↔ `operationContext` ↔ `tenantManager`. A language change at the centre of the graph would need FFI or a process boundary on every call, which adds latency rather than removing it. | atlas card Invariants and Pitfalls |
| Target language | None. Rust, Go and TypeScript would not change any user-visible number: the cost is I/O, x2t and the browser. TypeScript could add type safety against null/undefined bugs, but those bugs are found in DocService, not here. | baseline.md; PKT-0017 crash list |

## Discarded alternatives
- **refactor**: splitting `utils.js` or untangling the circular requires improves structure. No measured defect or latency would move: Common's fix rate is below DocService's, and the at-risk code (SSRF, JWT) is the part already tested. Reconsider it if the conditions below are met.
- **migrate (Rust/Go/TypeScript)**: the time is not in this module (per-message server cost < 0.1 % of the co-edit round trip). Interop at the root of the dependency graph would add a crossing to every call.
- **rewrite**: the external contract (config schema, `Context` wire format, storage key layout, queue DTOs) is shared by every service. Nothing in the evidence shows the design hurts users.
- **retire**: Common is the live core library.

## Path of change
None (keep). The only planned work is the measurement packet below.

## Initial packet plan
| Key | Wave | Type | Title |
|---|---|---|---|
| P1 | 0 | investigate | Measure Common's share of server-side request cost |

```yaml
packets:
  - key: P1
    wave: 0
    type: investigate
    title: Measure Common's share of server-side request cost
    files: [.theseus/oracle/baseline.md]
    create_in: [.theseus/oracle/perf]
    depends_on: []
    allowed_commands: ["*"]
    goal: Profile DocService under the PKT-0018 load test (load-coedit.js 50x5) and during a ConvertService run (e2e-convert.js) with node --cpu-prof. Report the share of DocService CPU and wall time spent in Common/ (operationContext/tenant config, storage-base, taskqueueRabbitMQ, utils, logger) and add it to baseline.md.
    context: The baseline has measured the server as a whole (receive → broadcast 4 ms p50, 0.28 core at 1 771 broadcasts/s; conversion overhead 55–95 ms) but has never isolated Common. The native package is installed (adapter/environment.md). This measurement decides whether DIAG-common stays keep.
```

## Risks
- Keep leaves the structural risk of `utils.js` and of untested storage and queue code in place. We would notice it as fix commits or crash issues touching `Common/sources/` in the upstream sync (PKT-0017 script).
- The baseline was measured on a 2-CPU VM with small to medium documents. A Common cost that only appears at scale (many tenants, S3 latency) would not show up. P1 partly covers this.

## What would change this verdict
- If P1 shows that Common takes more than 20 % of DocService CPU, or more than 10 ms p50 of a user-visible server segment (co-edit broadcast, conversion overhead), move to **refactor** of that path (for example tenant config caching or queue serialization).
- If upstream fix or crash commits in `Common/sources/` rise above DocService's rate, or a user-visible crash is traced to Common, move to **refactor** with characterization of storage, queues and `operationContext`.
- If DocService is migrated to another language (see DIAG-docservice), reassess Common as an interop boundary. It would then have to be migrated with it or exposed through a stable interface.
