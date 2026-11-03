---
id: DIAG-sdkjs-word
module: sdkjs-word
verdict: refactor
target_language: null
confidence: medium
conditional_on: null
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: 70173b0
round: 2
wave: 0
---

## Summary
**Refactor (performance), same language, round 2.** Round 1 located the time (PKT-0043: open is word layout + fonts, typing and remote apply are repaint-dominated, no JS kernel > 4 %) and delivered one correct, measured gain: incremental font collection cuts receiver busy time on remote typing by ≈ 7 % (PKT-0093). The rest of the user-felt cost (typing p90 115 ms, remote apply p90 105–463 ms, open ≈ 2 s after Editor.bin) is untouched and still lives in this module's layout and draw paths. Round 2 targets repaint scope on typing/remote apply, and first makes the differential oracle able to show such a gain.

## What round 1 proved and what it did not
| Packet | Outcome | Delivered toward the goal? |
|---|---|---|
| PKT-0043 profile | Open: layout + fonts dominate, Serialize2 13–23 % inclusive. Typing/apply: canvas drawImage 17–27 % self, *Draw* frames 33–57 % on stack; collab apply code < 1 %. | Yes (knowledge): decided where to look; ruled out migration (no kernel > 4 %). |
| PKT-0044 + PKT-0056 oracle | 42/42 QUnit suites incl. js-api-forms, run here today (rounds/sdkjs-word-r2.md). | Yes: oracle `partial`. |
| PKT-0095 differential oracle | original vs new on text/styles docx, 6 outputs compared; PASS today. | Yes, but its inputs are small and have no remote-apply load, so it cannot show speed gains (timing noise ±2–3 s). |
| PKT-0057 font walk (blocked) → PKT-0066 | Correct code, **gain 0** (PKT-0071: CTableId change forced full walk). | Not delivered alone. |
| PKT-0087 | Correct code, **gain 0** (PKT-0089: wrong change type, TableId_Add vs Description). | Not delivered. |
| PKT-0091 | 143/143 batches incremental, font collection 271 → 0.5 ms per 30 changes, B busy 3 737 → 3 459 ms (≈ −7 %) on 100 p (PKT-0093). | **Delivered**, ceiling reached (PKT-0071 estimated 5–7 %). |

Not delivered at all: open time, typing latency, repaint and recalc on remote apply. The installed bundle (original code) still shows typing p50/p90 46/115 ms and remote apply p50/p90 147/463 ms (rounds/sdkjs-word-r2.md, busy VM), the same order as PKT-0016. The round 1 gain is in the fork, not in the installed package.

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Goal: speed, co-edit | Remote apply p90 still > 100 ms; after the font fix, repaint and recalculation are what remains (*Draw* 33–57 % on stack). Limiting redraw to the changed lines/pages is the largest remaining lever in this module. | PKT-0043 table in baseline.md; PKT-0093; rounds/sdkjs-word-r2.md |
| Goal: speed, typing | Typing p90 115 ms, max 214 ms (> 50 ms threshold); same repaint-dominated profile as apply. | client-perf today; PKT-0043 |
| Goal: speed, open | ≈ 2 s after Editor.bin, layout + fonts; fonts partly in sdkjs/common. No refactor planned yet: needs a split of first-page vs whole-document recalc before guessing. | PKT-0016, PKT-0043 |
| Quality | All oracles green on new; round 1 changes behavior-neutral on every compared output. | rounds/sdkjs-word-r2.md |
| Oracle (D1) | QUnit `partial` + differential (6 outputs). Missing: a case with a large document and remote typing, and a render-level check of only-partially-redrawn pages (a repaint refactor can leave stale pixels the model hash will not see; `shown` hash helps). | PKT-0095 log |
| Coupling | Draw path goes through `CDrawingDocument` / `CGraphics` shared with sdkjs/common; keep changes in word's invalidation (which rects/pages are marked dirty), not in common drawing. | PKT-0043, card |
| Target language | None. No kernel > 4 % self; repaint is canvas (browser) work whose amount is decided by JS invalidation logic. | PKT-0043 |

## Discarded alternatives
- **keep**: typing and remote apply p90 are still above 100 ms and the cost is in this module's draw/recalc path; one lever (fonts) is used up, others are untried.
- **migrate / rewrite**: no compute kernel worth moving (PKT-0043), and the coupling to sdkjs/common globals is unchanged; the gain would be in canvas calls, which WASM does not reduce.
- **retire**: live editor.

## Path of change
Same language. P1 measures the repaint scope on typing and remote apply (how many pages/rects are redrawn per change, and the time of each) with the fork build injected, and names the invalidation call sites. P2 extends the differential oracle with a 100-page remote typing case whose timing and `shown` output can prove a repaint change both correct and faster. Wave 1 refactor packets are planned from P1's findings, each gated by P2 and the QUnit oracle. Lessons from round 1: verify on a live trace which change types and calls actually occur before writing the fix (PKT-0087 fixed a path never taken), and measure the ceiling first (PKT-0071).

## Initial packet plan
| Key | Wave | Type | Title |
|---|---|---|---|
| P1 | 0 | investigate | Measure repaint scope per keystroke and per remote change in sdkjs word |
| P2 | 0 | characterize | Add a large-document remote typing case to the sdkjs-word differential oracle |

```yaml
packets:
  - key: P1
    wave: 0
    type: investigate
    title: Measure repaint scope per keystroke and per remote change in sdkjs word
    files: [.theseus/oracle/baseline.md]
    create_in: [.theseus/oracle/perf]
    depends_on: []
    allowed_commands: ["*"]
    requires: [documentserver, browser]
    estimate: {files: 3, diff_lines: 400}
    acceptance:
      - node --check .theseus/oracle/perf/word-repaint.js
      - grep -q "word-repaint" .theseus/oracle/baseline.md
    goal: Write .theseus/oracle/perf/word-repaint.js. With the fork build injected by Playwright routing (as PKT-0093, bundles from .theseus/oracle/differential/build.sh) on large-100p.docx, count per local keystroke and per remote change how many pages and rectangles are invalidated and redrawn (wrap the word DrawingDocument / CDocument redraw and OnRecalculatePage / UpdateTarget entry points), the canvas drawImage calls and the ms each takes, and the recalculation range (pages recalculated). Record the table in baseline.md and name the call sites that decide the redraw range, with the expected ceiling of limiting redraw to the changed page or lines.
    context: PKT-0043 found typing and remote apply repaint-dominated (drawImage 17-27 % self, Draw frames 33-57 % on stack). PKT-0093 shows the font fix took ≈ 7 % and repaint/recalc remain. Round 1 lesson - trace what actually runs before planning a fix (PKT-0087).
  - key: P2
    wave: 0
    type: characterize
    title: Add a large-document remote typing case to the sdkjs-word differential oracle
    files: [.theseus/oracle/differential/run.cjs, .theseus/oracle/differential/sdkjs-word.sh, .theseus/oracle/differential/gen-inputs.py]
    create_in: [.theseus/oracle/differential]
    depends_on: []
    allowed_commands: ["*"]
    requires: [documentserver, browser]
    estimate: {files: 3, diff_lines: 250}
    acceptance:
      - bash .theseus/oracle/differential/sdkjs-word.sh
      - bash .theseus/oracle/differential/sdkjs-common.sh
    goal: Add to the sdkjs-word differential a case on a 100-page docx where A types about 30 characters spread over several pages while B receives them, comparing model, sent, shown (rendered hash of the visible pages on B, after settle) and reopened as today, and printing B's receiver busy time and typing latency for original and new over 3 runs (median), so a repaint or recalc refactor can be shown both equal and faster. Keep both scripts passing.
    context: PKT-0095's cases are small and their timing lines are noise (±2-3 s); round 1's measured gain needed a separate A/B harness kept in scratchpads (PKT-0071/0089/0093). A repaint refactor can leave stale pixels the model hash cannot see, so B's shown hash must cover more than the first page.
```

## Risks
- Repaint refactors can leave stale regions: P2's `shown` hash on B must cover the changed pages, and wave 1 should add a pixel check per changed page.
- Measurements on a shared 2-CPU VM vary by 2× between packets (PKT-0089 vs PKT-0093 *before* 237 vs 271 ms); compare A/B within one packet only.
- Round 1 gains are in the fork only; users get them once the fork build is shipped (outside this module).

## What would change this verdict
- If P1 shows the redraw is already limited to the changed page/lines (little to gain), move the focus to recalculation range, and if that is also tight, to **keep** for typing/apply and redirect to open (layout + fonts, partly sdkjs-common).
- If P1 shows canvas cost dominated by sdkjs/common drawing (CGraphics, fonts rasterisation) rather than by how much word redraws, redirect to sdkjs-common.
- If P2 cannot get stable timing (spread larger than the expected gain), the wave 1 refactors keep the PKT-0093-style A/B harness as their proof and P2 is limited to equality.
