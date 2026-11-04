---
id: DIAG-sdkjs-word
module: sdkjs-word
round: 3
verdict: refactor
target_language: null
confidence: medium
conditional_on: null
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: fc6eb01
wave: 0
covers: [layout-finish-paint, client-open-word]
not_covered:
  - {stage: paint, reason: "12.5 ms p50 per key (typing 51 ms p50, under 100 ms); the one measured lever (all-pages lock redraw, OnPaint 30 -> 18 ms) is owned by PKT-0144, pending"}
  - {stage: b-paint, reason: "15.5 ms p50 of co-edit 107 ms; same lock redraw as paint, owned by PKT-0144, pending"}
  - {stage: b-apply, reason: "3.3 ms p50 (3.1 %); the tail (full-document fallback, 260-420 ms on 1 event in 10) is owned by PKT-0145, pending"}
  - {stage: a-input, reason: "4.0 ms p50 (3.7 %) of co-edit; nothing to gain"}
  - {stage: handler, reason: "3.4 ms p50 (6.7 %) of typing; fast paragraph recalc, 1 page; nothing to gain"}
---

## Summary
**Refactor (performance), same language, round 3, refocused on open.** Round 2 delivered knowledge and an oracle case,
no speed: the fork is still at 0f61ccc. Its measurements (PKT-0109, reproduced today in rounds/sdkjs-word-r3.md) show
typing and remote apply already invalidate one page per change; their two remaining levers are already queued
(PKT-0144 lock redraw, PKT-0145 full-recalc fallback). The round 3 journey maps say where this module costs users time:
**opening** — `layout-finish-paint` 1 250 ms (27 %) of open-docx-100p and 471–741 ms elsewhere, `client-open-word`
473–1 057 ms — against 3–16 ms per key or change. Round 3 plans on open, ordered by that cost.

## What round 2 proved and what it did not
| Packet | Outcome | Delivered toward the goal? |
|---|---|---|
| PKT-0109 repaint scope | Invalidation unit is the page; fast paths already redraw only the changed page. Found `Send_Changes` clears all page caches on every send (ceiling OnPaint 30 → 18 ms/key local, none remote) and 4–5/40 remote events fall back to a 0–85 page recalc (260–420 ms). Reproduced today: same shape, 2/20 fallbacks. | Knowledge only; spawned PKT-0144/0145. **No gain delivered.** |
| PKT-0110 large remote-typing case | large.docx in the differential: six outputs equal; timing median of 3. `long` varies 485–698 ms between runs of one build. | Oracle yes (equality on 100 p, `shown` on typed pages). Timing too noisy to prove gains < ~200 ms; A/B harnesses (word-repaint.js) remain the proof. |
| Round 1 font fix (PKT-0091) | Still only in the fork; −7 % B busy (PKT-0093), invisible in today's differential noise. | Delivered in the fork, not yet to users. |

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Speed, open (largest) | `layout-finish-paint` = recalculation of the remaining pages on the timer after load-complete plus paint: 1 250 ms of 4 628 on 100 p, 741 of 8 340 on 10 p. Not yet split into compute vs timer idle vs paint; unknown whether the loop yields idle gaps or recalcs pages never shown. | journeys/open-docx-100p.md, open-docx-10p.md |
| Speed, open (read) | `client-open-word` (Serialize2 read + first-page recalc) 473–1 057 ms; PKT-0133 (pending) profiles it per module on 10 p. | journeys/open-docx-10p.md, PKT-0133 |
| Speed, typing / co-edit | p50 51 / 107 ms, this module 16–23 ms of it; levers queued (PKT-0144, 0145). | journeys typing.md, coedit-remote.md; r3 repaint table |
| Quality | All oracles green on new today (42/42, 7/7, differential 3+3 cases). | rounds/sdkjs-word-r3.md |
| Oracle (D1) | Sufficient for a layout-loop refactor: QUnit + differential `model`/`shown`/`reopened` on large.docx detect layout changes; the open journey script measures. | PKT-0110, journeys |
| Target language | None: layout is JS object-graph work across Paragraph/Run/Table, coupled to sdkjs-common text measurement; no isolated kernel (PKT-0043, no kernel > 4 %). | PKT-0043 |

## Discarded alternatives
- **keep**: 1.25 s of a 4.6 s open is this module's post-load layout and is not yet understood; levers are untried.
- **migrate / rewrite**: no kernel to move; layout state is shared with sdkjs-common globals; unchanged from round 2.
- **retire**: live editor.
- **More typing/co-edit work now**: the remaining gains there (≤ 12 ms/key, the fallback tail) are already queued.

## Path of change
Same language. P1 splits `layout-finish-paint` on open-docx-100p into recalc compute per page, idle time between timer
slices, paint, and whether pages are recalculated that the user has not reached, with the input latency a user would
feel typing during it; it names the call sites (`ContinueRecalculationLoop`, the recalc timer interval and slice size in
`word/Editor/Document.js`) and the ceiling of each lever (denser slices, no idle gaps, yielding to input). Refactor
packets follow from P1, gated by the differential (large.docx) and the open journey measure. `client-open-word` waits on
PKT-0133 for its split. Lesson from rounds 1–2: measure the ceiling before planning the fix, and trace what actually runs.

## Initial packet plan
| Key | Wave | Type | Title |
|---|---|---|---|
| P1 | 0 | investigate | Split the post-load layout window of a 100-page docx open in sdkjs word |

```yaml
packets:
  - key: P1
    wave: 0
    type: investigate
    title: Split the post-load layout window of a 100-page docx open in sdkjs word
    files: [.theseus/oracle/baseline.md]
    create_in: [.theseus/oracle/perf]
    depends_on: []
    allowed_commands: ["*"]
    requires: [documentserver, browser]
    estimate: {files: 2, diff_lines: 350}
    acceptance:
      - node --check .theseus/oracle/perf/word-layout-window.js
      - grep -q "word-layout-window" .theseus/oracle/baseline.md
    goal: Write .theseus/oracle/perf/word-layout-window.js. On open-docx-100p (sample .theseus/oracle/journeys/open-docx-100p.docx, fork bundle injected as word-repaint.js does), from isDocumentLoadComplete to the end of layout, record each timer slice of CDocument.ContinueRecalculationLoop / Recalculate_Page (pages per slice, ms per slice, idle ms between slices and the timer interval used), the paint calls in the window, and the key-to-frame latency of a keystroke sent at 100 ms and 500 ms into the window. Report in baseline.md the split compute / idle / paint, the call sites deciding slice size and interval, and the ceiling of removing idle gaps, enlarging slices and yielding to input, each in ms of the 1 250 ms stage.
    context: Round 3 journey open-docx-100p gives layout-finish-paint 1 250 ms (27 % of 4 628), the largest sdkjs-word stage; typing/co-edit levers are already queued (PKT-0144, PKT-0145) and client-open-word is profiled by PKT-0133. Lesson from rounds 1-2 - measure the ceiling and trace what actually runs before writing a fix.
```

## Risks
- The 2-CPU shared VM moves open times by seconds; P1 must compare within one run and report idle vs compute, not totals.
- Making background layout greedier can hurt input during it: P1 measures typing latency in the window for that reason.
- PKT-0144/0145 results and the round 1 font fix reach users only when the fork build is shipped.

## What would change this verdict
- If P1 shows the window is compute-bound in text measurement (sdkjs-common fonts/shaper), redirect the open work to sdkjs-common and move this module to **keep** for open.
- If P1 shows the window is mostly idle timer gaps, the refactor is a small change to the loop pacing in `Document.js` (high value, low risk).
- If PKT-0145 finds the fallback is triggered by a common change class, the co-edit tail becomes the next row here.
