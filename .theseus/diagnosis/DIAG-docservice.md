---
id: DIAG-docservice
module: docservice
round: 2
verdict: refactor
target_language: null
confidence: medium
conditional_on: null
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: bdff618
wave: 0
---

## Summary
**Refactor, in JavaScript (unchanged verdict).** Round 1 delivered the one speed gain this module owns:
synchronous ConvertService now answers 0.44-1.56 s sooner per request (p50, original installed server
against the worktree code, `.theseus/oracle/rounds/docservice-r2.md`). The quality half delivered only
part: the pinned DocsCoServer crash paths are guarded (PKT-0070), but the `editorStat` fallback bug is
still on `main`, and the two upstream crash/hang fixes (81132, 81576) were assessed but not ported.
DocService remains a small share of open, co-edit and conversion time, so a language change still gains
nothing users feel. Round 2 finishes the crash work and checks the DB cost of the faster polling.

## What round 1 proved and what it did not
| Round 1 row | Packet(s) | Status | Evidence |
|---|---|---|---|
| P1 characterize convert | PKT-0027 | delivered (oracle) | `tests/unit/converterService.tests.js` |
| P2 characterize crash paths | PKT-0028, PKT-0079 (flake fix) | delivered (oracle) | `tests/unit/docsCoServerCrashPaths.tests.js`, 15/15 runs green |
| P3 shorter sync poll | PKT-0063 (blocked: contract), PKT-0068 | **delivered, user-felt** | docx->odt p50 1265 -> 164 ms, pdf->docx 1022 -> 161 ms (r2 file); PKT-0068 1018 -> 166 ms |
| P4 guard crash paths | PKT-0064 (blocked), PKT-0070 | **partly**: guards for no-handshake, unauthenticated unLock/save, forcesave without user, id-less user, auth without token/user are on `main` (862c11b). The `editorStat` fallback fix and `editorStatProxy` fallback were written in PKT-0064 but never merged: `DocsCoServer.js:155` still `new editorDataStorage()`. | `grep -n` on line 155 |
| P5 upstream 81132/81576 | PKT-0029, PKT-0050 | **not delivered** to users: assessment and patches only (`.theseus/diagnosis/PKT-0029-*`); `routes/static.js:141` still `res.sendStatus(400)` without a `headersSent` check | diagnosis file, static.js |
| e2e-convert script fix | PKT-0076 | delivered (tooling) | script ran here with JWT, 0 errors |

Not proved: crash reduction itself (no crash telemetry; gain inferred from upstream history); DB load of
the extra polls; that users get any of it (the installed package still runs the original code).

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Speed, convert | Done in this module: sync answers now track x2t time; what is left is x2t (PDF 0.77-1.57 s). | r2 file; DIAG-x2t |
| Speed, co-edit / open / save | Unchanged from round 1: server segment 4 ms p50, open and save dominated by client and `savetimeoutdelay`. No new measurement points at DocService. | baseline.md PKT-0015/0018 |
| Quality | Remaining known defects in this module: 81132 (client abort mid-stream crashes, `static.js`, `aiProxyHandler.js`), 81576 (SaveVersion not released, shutdown hangs), editorStat fallback. | PKT-0029 diagnosis; DocsCoServer.js:155 |
| Cost of the gain | Backoff adds up to ~6 `taskResult.select` per sync request in the first 1.5 s; not measured under load. | PKT-0068 log |
| Oracle (D1) | Unit oracle 178 passed / 1 skipped; convert and crash-path characterization exist. No differential oracle script for DocService (round 2 used installed vs source by hand). | r2 file |
| Target language | None, same reasons as round 1. | baseline |

## Discarded alternatives
- **keep**: leaves two known upstream crash/hang bugs and a storage bug in place.
- **migrate / rewrite**: no measured time in this module worth a new language; the round 1 gain came from one constant.
- **retire**: the module is the server.

## Path of change
Not applicable. Each row runs the unit oracle; the port rows add a test for the crash they fix.

## Packet plan (round 2)
| Key | Wave | Type | What | Gain toward the goal |
|---|---|---|---|---|
| P1 | 0 | refactor | Merge the editorStat / editorStatProxy fallback fix from PKT-0064 | correct stats storage on legacy module |
| P2 | 0 | refactor | Port upstream 81132 (client abort during streaming) | one fewer process crash |
| P3 | 0 | investigate | Test plan and decision for 81576 (SaveVersion release) | shutdown/save hang |
| P4 | 0 | investigate | DB load of backoff polling under 4-parallel sync converts | confirms P3-r1 gain has no hidden cost |

```yaml
packets:
  - key: P1
    wave: 0
    type: refactor
    title: Fix editorStat and editorStatProxy storage fallbacks in DocsCoServer
    files: [DocService/sources/DocsCoServer.js]
    create_in: [tests/unit]
    depends_on: []
    estimate: {files: 2, diff_lines: 90}
    goal: Make editorStat fall back to the legacy constructor of its own module (editorStatStorage) instead of editorDataStorage, give editorStatProxy the same fallback, and test the three instances, re-applying the design PKT-0064 wrote (createStorageInstance helper) on current main.
    context: DocsCoServer.js:155 still uses new editorDataStorage() for editorStat; PKT-0064 implemented the fix with tests/unit/docsCoServerGuards.tests.js but was blocked and never merged. Do not change tests/unit/docsCoServerCrashPaths.tests.js.
  - key: P2
    wave: 0
    type: refactor
    title: Port upstream fix 81132 for client abort during file streaming
    files: [DocService/sources/routes/static.js, DocService/sources/ai/aiProxyHandler.js]
    create_in: [tests/unit]
    depends_on: []
    estimate: {files: 3, diff_lines: 160}
    goal: Apply the logic hunks of ONLYOFFICE commit 12ba395e (.theseus/diagnosis/PKT-0029-upstream-81132.patch) so an aborted client during streaming no longer sends a status after headers are sent, with a unit test that aborts a stream mid-way.
    context: PKT-0029 checked the logic hunks apply with git apply --check -C1; static.js:141 still calls res.sendStatus(400) without a headersSent check. Recommended low risk.
  - key: P3
    wave: 0
    type: investigate
    title: Decide the port of upstream fix 81576 with a test plan
    files: []
    create_in: [.theseus/diagnosis]
    depends_on: []
    estimate: {files: 1, diff_lines: 120}
    acceptance: ['test -s .theseus/diagnosis/PKT-81576-test-plan.md']
    goal: Write .theseus/diagnosis/PKT-81576-test-plan.md describing how SaveVersion is released after a failed final assembly in commit 8585bcf4, which save-state semantics it changes, and the characterization tests needed before porting, for a human decision.
    context: PKT-0029 rated it medium risk; patch in .theseus/diagnosis/PKT-0029-upstream-81576.patch; shutdown.js waits for SaveVersion rows to reach 0.
  - key: P4
    wave: 0
    type: investigate
    title: Measure DB load of backoff sync-convert polling
    files: []
    create_in: [.theseus/oracle/rounds]
    depends_on: []
    requires: [documentserver]
    estimate: {files: 1, diff_lines: 60}
    acceptance: ['grep -q "taskResult" .theseus/oracle/rounds/docservice-r2-dbload.md']
    goal: Run SYNC=1 .theseus/oracle/perf/e2e-convert.js 10 4 against the installed server (original) and the worktree DocService on :8099 (new), count taskResult selects per request (PostgreSQL pg_stat_statements or log_statement) and record latency and select counts in .theseus/oracle/rounds/docservice-r2-dbload.md.
    context: PKT-0068 expects up to ~6 extra selects per sync request in the first 1.5 s; .theseus/oracle/rounds/docservice-r2.md shows how to run the worktree server on :8099.
```

## Risks
- The 81132 port touches HTTP streaming used by every file download; the test and the e2e scripts catch a regression.
- Users see none of round 1 until a package is built from `main`; that is outside this module's code.

## What would change this verdict
- If P4 shows the backoff polling loads the DB enough to slow parallel converts, tune the backoff (still refactor).
- If a server-side open split shows DocService >= 10 % of open time, reassess migrate of that path with D3.
- If no crash/hang remains open after P1-P3, the next round should be **keep**.
