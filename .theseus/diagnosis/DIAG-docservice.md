---
id: DIAG-docservice
module: docservice
verdict: refactor
target_language: null
confidence: medium
conditional_on: null
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: bd13c27
wave: 0
---

## Summary
**Refactor, in JavaScript.** Measured end to end, DocService is a small share of every user-visible
time: the server segment of a co-edit round trip is 4 ms p50 of ~100–126 ms, open is ~3–4 s in the client,
conversion is 70–90 % x2t. A language change (Rust/Go/TypeScript) would therefore gain nothing users feel.
What DocService does own is (a) a fixed 1 s polling sleep that adds up to ~900 ms to every synchronous
ConvertService call, and (b) a quarter of all upstream fix commits and most crash fixes, concentrated in
`DocsCoServer.js` and `canvasservice.js`, which have no tests. Both are fixed in place.

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Goal: speed, co-edit | Server receive → broadcast is 4 ms p50 / ≤ 69 ms p99 and does not grow with clients; the tail is the browsers (CPU starvation). Load test: flat latency to 1 000 sockets / 1 800 broadcasts/s at 0.28 core. Nothing to win here by a new language. | baseline.md "Co-edit tail split, load test" (PKT-0018) |
| Goal: speed, open | Open 3.4–4.4 s; ~1.5–2.3 s editor scripts + 1.5–2.4 s after Editor.bin, both client; x2t open conversion 0.1–0.3 s; DocService part not isolated but a few %. | baseline.md PKT-0016, PKT-0018 large files |
| Goal: speed, convert | x2t is 70–90 % of PDF conversions; service overhead ≈ 55–95 ms (≈ 0.1 s on large files). **But sync mode answers in whole seconds**: `CONVERT_ASYNC_DELAY = 1000` + `utils.sleep` loop, so a 140 ms ODF conversion is returned after ≥ 1 s (+ up to 900 ms per request). This is in this module and is a direct user-felt gain. | `DocService/sources/converterservice.js:49,163`; baseline.md PKT-0015 |
| Goal: speed, save | Save ≈ 6 s is mostly `savetimeoutdelay` = 5 000 ms (configuration in `Common/config/default.json`, a product choice, not code) + ~1 s x2t assembly. | baseline.md PKT-0015 |
| Goal: in-process hot paths | JSON of a 50-change batch 60 µs; locks 4.5 µs: < 0.1 % of the round trip. | baseline.md micro-benchmarks |
| Quality and security risk | `DocService/` has 421 fix / 1 115 commits and 13 of 21 crash fixes; `DocsCoServer.js` alone 197 fix / 562 commits, 7 crash; `canvasservice.js` 131/318, 5 crash; `wopiClient.js` 64/130. Crash fixes are null/undefined guards and unhandled errors (user, tenant, connection, forcesave after close, socket error on disconnect). Two upstream crash/hang fixes (bugs 81132, 81576) are missing from Euro-Office `main`. | baseline.md "Upstream defect / crash rate" (PKT-0017) |
| Quality: structure | `DocsCoServer.js` 4 736 lines with global module state (`editorData`, `editorStat`, queue, shutdown flags); `DocsCoServer.js:155` falls back to `new editorDataStorage()` for `editorStat` (likely copy-paste bug); `co`/generator mixed with async/await. | `wc -l DocService/sources/*.js`; card Pitfalls; `DocsCoServer.js:155` |
| Oracle (D1) | `partial`: unit tests cover `utilsDocService`, request/SSRF, utils; **no tests** for `DocsCoServer.js`, `canvasservice.js`, `converterservice.js`, `wopiClient.js`. Refactors of those must be preceded by characterization. | `ls tests/unit`; card "Available oracle" |
| Coupling and interop | Depends on Common (config, storage, queues, DB connectors in four SQL dialects) and talks to FileConverter via RabbitMQ and to clients via Socket.IO; a refactor keeps every external contract unchanged, so no interop bridge is needed. | card Entry points, Pitfalls |
| Target language | None. Rust/Go would cut µs from paths that are < 0.1 % of user time and add an interop boundary inside the busiest, least-tested file. Gradual type checking (`// @ts-check`/JSDoc) on touched files is the cheap part of the TypeScript benefit and fits a refactor. | measurements above |

## Discarded alternatives
- **keep**: leaves the sync-convert second and the crash-prone, untested co-edit code as they are; both are measured, user-felt costs.
- **migrate (rust/go/typescript)**: no measured speed gain (server segment 4 ms of the round trip, x2t and client dominate); the quality gain of TypeScript comes mainly from tests and guards, obtainable in place. Would also need D3 double diagnosis; not the reason for rejecting it.
- **rewrite**: the external contract is large (Socket.IO protocol with sdkjs, ConvertService/Command APIs, WOPI, four SQL dialects) and the oracle is partial; nothing measured shows the design itself costs users time.
- **retire**: the module is the server.

## Path of change
Not applicable (no language change). Order: characterize first, then small refactors behind the same
contracts; every refactor packet runs the unit oracle plus its characterization tests.

## Initial packet plan
| Key | Wave | Type | What | Gain toward the goal |
|---|---|---|---|---|
| P1 | 0 | characterize | Tests for `converterservice` sync/async convert flow | oracle for P3 |
| P2 | 0 | characterize | Tests for `DocsCoServer` crash-prone paths (connection/auth with missing user/tenant, disconnect during save, forcesave after close) | oracle for P4 |
| P3 | 1 | refactor | Replace the fixed 1 s sync-convert poll with short/backoff polling | up to −900 ms per sync convert |
| P4 | 1 | refactor | Guard the crash-prone paths found by P2; fix `editorStat` fallback at `DocsCoServer.js:155` | fewer crashes |
| P5 | 0 | investigate | Port of upstream fixes for bugs 81132 and 81576 (decision for humans) | fewer crashes/hangs |

```yaml
packets:
  - key: P1
    wave: 0
    type: characterize
    title: Characterize ConvertService sync and async flow in converterservice.js
    files: []
    create_in: [tests/unit]
    depends_on: []
    goal: Pin the behaviour of convertJson/convertXml in sync (async=false) and async mode, including the polling loop, timeout (CONVERT_TIMEOUT) and error statuses, with taskResult and the queue mocked.
    context: The loop is at DocService/sources/converterservice.js:156-170 with CONVERT_ASYNC_DELAY=1000 (line 49). Baseline PKT-0015 shows sync answers in whole seconds.
  - key: P2
    wave: 0
    type: characterize
    title: Characterize DocsCoServer crash-prone connection and save paths
    files: []
    create_in: [tests/unit]
    depends_on: []
    goal: Pin, with editorDataMemory and mocked sockets/queues, the behaviour of auth with missing user name/permissions/tenant, client disconnect during save or file streaming, and forcesave after close.
    context: These are the paths of the upstream crash fixes listed in .theseus/oracle/baseline.md (PKT-0017). DocsCoServer.js has no tests today and 4 736 lines of global state.
  - key: P3
    wave: 1
    type: refactor
    title: Shorten the synchronous ConvertService polling delay
    files: [DocService/sources/converterservice.js]
    create_in: []
    depends_on: [P1]
    goal: Return synchronous conversions as soon as the task ends (short or backoff polling, e.g. 50 ms growing to 1 s) without changing the API or the timeout, and measure sync docx->odt latency before and after with .theseus/oracle/perf/e2e-convert.js.
    context: Baseline PKT-0015 - sync mode adds up to 900 ms per request. Keep DB load reasonable (taskResult.select per poll).
  - key: P4
    wave: 1
    type: refactor
    title: Guard DocsCoServer crash-prone paths
    files: [DocService/sources/DocsCoServer.js]
    create_in: [tests/unit]
    depends_on: [P2]
    goal: Add the missing null/undefined guards and error handling found by P2 and fix the editorStat fallback at DocsCoServer.js:155 (new editorDataStorage() used for editorStat), with tests.
    context: Crash fixes upstream are almost all such guards in DocsCoServer.js, canvasservice.js and converter.js (baseline PKT-0017).
  - key: P5
    wave: 0
    type: investigate
    title: Assess porting upstream crash fixes 81132 and 81576
    files: []
    create_in: [.theseus/diagnosis]
    depends_on: []
    goal: Locate the ONLYOFFICE commits for bug 81132 (client disconnect during file streaming crashes the process) and 81576 (SaveVersion not released after failed final assembly, prepare4shutdown hangs), describe the diff and whether it applies to Euro-Office main, for a human decision.
    context: Found by PKT-0017; 81132 is only on Euro-Office side branches such as release/v9.4.0, 81576 is absent from every Euro-Office ref.
```

## Risks
- Shorter sync polling raises `taskResult.select` load on the database; P3 must measure it under the
  4-parallel convert run, and a regression shows there.
- Guards in `DocsCoServer.js` may change protocol behaviour sdkjs relies on; P2 characterization and the
  e2e co-edit script (`perf/e2e-coedit.js`) catch it.
- The baseline has no production crash telemetry; the quality gain is inferred from fixed-defect history.

## What would change this verdict
- If a server-side open split (DocService open request → Editor.bin ready) shows DocService ≥ 10 % of open
  time, or a load test beyond 1 000 sockets shows DocService CPU-bound with latency rising, reassess
  **migrate** of the co-edit hot path (Go or Rust) with a D3 double diagnosis.
- If P2/P4 show the crash paths cannot be made safe without breaking the global-state design of
  `DocsCoServer.js`, reassess **rewrite** of the co-edit coordinator behind the Socket.IO contract.
- If production telemetry shows crashes concentrated outside DocService, lower P4's priority.
