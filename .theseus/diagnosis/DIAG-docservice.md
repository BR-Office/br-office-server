---
id: DIAG-docservice
module: docservice
round: 3
verdict: refactor
target_language: null
confidence: medium
conditional_on: null
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: 2d69a44
wave: 0
covers: [server-open-docservice]
not_covered:
  - {stage: save-delay, reason: "85.5 % of save, but owned by PKT-0140 (pending, explicit-close save); PKT-0137 showed a server-only change breaks the reload contract"}
  - {stage: queue, reason: "3-4 ms (0.1-0.3 %) in convert and save; nothing to gain"}
  - {stage: result, reason: "1-6 ms (0.1 %) in convert and save; nothing to gain"}
  - {stage: request, reason: "3 ms (0.3 %) of convert; nothing to gain"}
  - {stage: up, reason: "0.1 ms of co-edit; nginx/Socket.IO transport"}
  - {stage: server, reason: "3.0 ms p50 (2.8 %) of co-edit; the waits are the client's 40 ms ticks"}
  - {stage: down, reason: "0.8 ms of co-edit; transport"}
---

## Summary
**Refactor, in JavaScript (unchanged).** Round 2 delivered its two code rows (storage fallbacks PKT-0113, upstream
81132 port PKT-0114), both correctness fixes no journey can see. Its two investigate rows (PKT-0115, PKT-0116) are
still pending. The round 3 differential (`.theseus/oracle/rounds/docservice-r3.md`) found that the round 1 speed gain
is partly a **regression**: the sync-convert backoff (`converterservice.js:169`) doubles up to 1 s, so a conversion ending
at 0.75-1.0 s is answered at ~1.55 s instead of ~1.0 s (pptx->pdf 1006 -> 1572 ms p50). Round 3 fixes that and splits
the one docservice journey stage with real time left that no packet owns (open, 538 ms in open-docx-10p).
The biggest docservice stage, the 5 s save delay, is already owned by PKT-0140.

## What round 2 proved and what it did not
| Round 2 row | Packet | Status | Evidence |
|---|---|---|---|
| P1 editorStat / editorStatProxy fallbacks | PKT-0113 | delivered (correctness); no user-felt time | `tests/unit/docsCoServerGuards.tests.js`; unit 186 passed |
| P2 port 81132 (abort mid-stream) | PKT-0114 | delivered (correctness; test fails on old code); no user-felt time | `tests/unit/staticAbort.tests.js` |
| P3 81576 test plan | PKT-0115 | **not delivered** (pending) | queue/pending |
| P4 DB load of backoff polling | PKT-0116 | **not delivered** (pending) | queue/pending |

Not proved: that round 1's poll change is a gain for every conversion. It is not: r3 shows +566 ms on pptx->pdf and
an unstable xlsx->pdf (775 or 1565 ms). Round 2 measured it once (r2 file: pptx->pdf 1569 ms new vs 2013 original,
read as a gain only because the original's first runs were cold). Crash reduction is still inferred, not measured.

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Speed, save | 5006 ms of 5853 is `savetimeoutdelay`; owned by PKT-0140 (integrator close path). | journeys/save.md; PKT-0137 log |
| Speed, open | server-open-docservice 81-538 ms (1-6.5 %); 538 ms in open-docx-10p is not explained by a split. | journeys/open-*.md |
| Speed, sync convert | Backoff overshoot: up to +0.8 s for conversions of 0.75-1.0 s. Cap the delay. | rounds/docservice-r3.md; converterservice.js:160-169 |
| Speed, co-edit, async convert | 3.9 ms and 7 ms: nothing left in this module. | journeys/coedit-remote.md, convert-docx-pdf.md |
| Quality | 81576 still open (PKT-0115 pending). | PKT-0029 |
| Oracle (D1) | unit oracle 186 passed / 1 skipped, occasionally 1 flaky failure. | r3 file |
| Target language | None: no measured time in this module that a language would change. | journeys |

## Discarded alternatives
- **keep**: leaves a measured regression of up to 0.8 s on sync conversions.
- **migrate / rewrite**: the time in docservice stages is a sleep (config) and polling (a constant), not computation.
- **retire**: the module is the server.

## Path of change
Not applicable (refactor). Each row runs the unit oracle; P1 is measured with the r3 differential.

## Initial packet plan
Ordered by the time each stage costs the user. (save-delay, 5 s, is PKT-0140; not repeated here.)

| Key | Wave | Type | What | Gain toward the goal |
|---|---|---|---|---|
| P1 | 0 | investigate | Split server-open-docservice in open-docx-10p (538 ms) | find the 0.3-0.5 s that the other open maps do not show |
| P2 | 0 | refactor | Cap the sync-convert poll delay at 200 ms | removes up to 0.8 s on 0.75-1.0 s conversions |

```yaml
packets:
  - key: P1
    wave: 0
    type: investigate
    title: Split the DocService open stage of open-docx-10p (538 ms)
    files: []
    create_in: [.theseus/oracle/rounds]
    depends_on: []
    requires: [documentserver, browser]
    estimate: {files: 1, diff_lines: 80}
    acceptance: ['grep -q "commandOpen" .theseus/oracle/rounds/docservice-r3-open.md']
    goal: Run the open-docx-10p journey 5 times with the DocService DEBUG log and split server-open-docservice (538 ms p50) into commandOpen, taskresult upsert, RabbitMQ round trip and wait-for-x2t marks; record the split and the one change that would remove most of it in .theseus/oracle/rounds/docservice-r3-open.md.
    context: Same stage is 81-206 ms in the other open maps (journeys/open-*.md); the difference may be the first-open conversion wait attributed to DocService.
  - key: P2
    wave: 0
    type: refactor
    title: Cap the sync ConvertService poll delay at 200 ms
    files: [DocService/sources/converterservice.js, tests/unit/converterService.tests.js]
    create_in: []
    depends_on: []
    estimate: {files: 2, diff_lines: 60}
    acceptance: ['.theseus/oracle/unit.sh']
    goal: Add CONVERT_SYNC_DELAY_MAX = 200 and use it as the cap in converterservice.js:169 instead of CONVERT_ASYNC_DELAY, with a unit test of the poll instants (50, 150, 350, 550, ...), then rerun SYNC=1 node .theseus/oracle/perf/e2e-convert.js 5 1 against the installed server and the worktree on :8099 and record that pptx->pdf p50 is <= the original's (~1010 ms) in the executor log.
    context: rounds/docservice-r3.md shows pptx->pdf 1006 ms original vs 1572 ms new because polls fall at 750 then 1550 ms. PKT-0116 measures the DB cost of the polls; a 200 ms cap adds at most 5 selects/s.
```

## Risks
- P2 adds DB selects on long sync conversions (5/s instead of 1/s); PKT-0116 measures that cost.
- Users see none of this until a package is built from `main`.

## What would change this verdict
- If P1 shows DocService itself (not waiting for x2t) costs >= 10 % of open, reassess that path (still JS unless D3 says otherwise).
- If PKT-0140 lands and P1/P2 leave nothing above 1 % of any journey, the next round should be **keep**.
