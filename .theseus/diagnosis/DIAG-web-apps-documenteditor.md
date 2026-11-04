---
id: DIAG-web-apps-documenteditor
module: web-apps-documenteditor
round: 3
verdict: keep
target_language: null
confidence: medium
conditional_on: null
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: f76cfec
wave: 0
covers: [editor-shell-boot]
not_covered:
  - {stage: client-open-webapps-ui, reason: "160-359 ms after content ready (3.5-4.3 %); its main item, Comments build, was deferred by PKT-0112/0132 and gained nothing measurable (Ready -2 ± 21 ms, 30 pairs); below what this VM resolves"}
  - {stage: api-js-load, reason: "5-35 ms on a quiet VM (open-docx-100p, real-internet); the 415-694 ms in open-docx-10p/real is the example host page DOMContentLoaded on a loaded VM, not web-apps code"}
---

## Summary
**Keep.** Round 2's pre-registered exit rule fired. The rule said: if P1 and P2 together move LoadDoc by less than 150 ms, move to keep. The toolbar deferral (PKT-0111) gave −60 / −100 ms LoadDoc (paired median) with Ready +28 / +85 ms. The Comments deferral (PKT-0112, then PKT-0132) gave −25 ms, and later Ready −2 ± 21 ms over 30 quiet pairs. Round 3 adds the reason. LoadDoc coincides with the end of the 18 MB `sdk-all.js` download. Delaying `asc_LoadDocument` by 0.2–0.5 s did not move Ready above noise. So the ≈ 0.7 s of web-apps CPU before LoadDoc mostly runs while the editor waits for sdkjs, and cutting it is not felt (rounds/web-apps-documenteditor-r3.md). The open time the user feels is in sdkjs-word, fonts and the server path. Those belong to their own diagnoses.

## What round 2 proved and what it did not
| Packet | Delivered | Gain toward the goal |
|---|---|---|
| PKT-0111 toolbar tabs deferred (blocked) | Correct deferral, differential PASS; LoadDoc −60 / −100 ms paired, Ready +28 / +85 ms | **not delivered** (inside spread, Ready unchanged) |
| PKT-0112 Comments build deferred (blocked) | Correct; LoadDoc −25 ms pooled, Ready unchanged | **not delivered** |
| PKT-0132 lazy Comments wiring (discarded) | Ready −2 ± 21 ms, 30 quiet pairs; reverted | **not delivered** |
| PKT-0125 toolbar view panels (pending) | not run | — |

Round 2 proved that the deferrals are behaviour-safe: both oracles pass. It also proved that the toolbar and Comments together cost under ≈ 150 ms of the user's wait. It did not deliver any open-time gain.

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Speed, open | LoadDoc 2.2–2.7 s, Ready 5.7–7.4 s under load 10–13 (r2, quieter: 1.2 s / 3.3–3.9 s); identical code | rounds r3, r2 |
| Is pre-LoadDoc UI on the critical path? | No (suggestive): LoadDoc = end of sdk-all.js download (2 707 vs 2 710 ms; 2 181 vs 1 993 ms); delaying LoadDoc by +526 / +207 ms moved Ready by +147 / −729 ms (spread ±1.2 s) | rounds r3, critical-path test |
| What web-apps costs | ≈ 0.7 s CPU before LoadDoc (vendor 0.4, common 0.15, DE 0.15), overlapping the sdkjs download | rounds r3 CPU table |
| After content ready | client-open-webapps-ui 160–359 ms; Comments deferral gave nothing measurable | journeys/open-docx-*.md; PKT-0132 log |
| The 2 s target (open-docx-real) | The remaining time is sdkjs-word layout, fonts (16 MB), sdk-all.js parse (1.3–1.4 s CPU), x2t, docservice | journeys; DIAG-sdkjs-word |
| Quality | Oracles PASS on upstream; no defects found in this module this round | differential, open oracle |
| Oracle (D1) | partial (open/type/save + differential) | card |

## Discarded alternatives
- **refactor (more deferral, PKT-0125)**: the Toolbar's whole pre-LoadDoc cost is ≈ 220 ms, and it overlaps the sdk-all.js wait. Three packets show the gain is below what this VM can resolve.
- **refactor: issue `asc_LoadDocument` before the UI build**: this pays only if LoadDoc is gated by the UI. The r3 evidence says it is gated by sdk-all.js. P1 checks this on a quiet VM before anyone tries it.
- **migrate / rewrite**: the work is DOM building that overlaps another wait. No language gains time here.
- **retire**: this is the live editor UI.

## Path of change
None in code. Recommendations for the factory:
- Close **PKT-0111** and **PKT-0112** as no measurable effect, without merging their fork branches (the same as PKT-0132).
- Discard **PKT-0125**: it targets the same ≤ 220 ms that overlaps the sdkjs wait, and its "beyond the spread" bar is unreachable (PKT-0111 attempt 3).

The single row below confirms the critical-path finding on a quiet VM, so that the keep verdict, or the opposite, rests on clean numbers.

## Initial packet plan
| Key | Wave | Type | Title |
|---|---|---|---|
| P1 | 0 | investigate | Confirm on a quiet VM whether the documenteditor UI build is on the open critical path |

```yaml
packets:
  - key: P1
    wave: 0
    type: investigate
    title: Confirm on a quiet VM whether the documenteditor UI build is on the open critical path
    files: []
    create_in: [.theseus/oracle/perf, .theseus/oracle/rounds]
    depends_on: []
    allowed_commands: ["*"]
    requires: [documentserver, browser]
    estimate: {files: 2, diff_lines: 120}
    acceptance:
      - test -s .theseus/oracle/perf/loaddoc-delay.js
      - test -s .theseus/oracle/rounds/web-apps-documenteditor-r3-critical-path.md
      - grep -q "dReady" .theseus/oracle/rounds/web-apps-documenteditor-r3-critical-path.md
    goal: Commit the script from rounds/web-apps-documenteditor-r3.md as .theseus/oracle/perf/loaddoc-delay.js. On an idle VM (load < 1.5; record it), run it with 0, 300 and 800 ms delays, 15 alternating pairs each, on medium-10p.docx and large-100p.docx. Write the paired B-A Ready medians and IQR to .theseus/oracle/rounds/web-apps-documenteditor-r3-critical-path.md. Also record the gap between the end of the sdk-all.js download and the start of LoadDoc. State which of these holds - (a) Ready moves less than 30 % of the delay, so keep stands; (b) Ready moves more than 70 %, so request a refactor packet that issues asc_LoadDocument before the toolbar/comments build.
    context: Round 3 measured it under load 10-13. Delays of +526 and +207 ms moved Ready by +147 and -729 ms (spread ±1.2 s). LoadDoc coincided with the end of the sdk-all.js download. Run it as an exclusive packet; PKT-0112/0132 lost attempts to a loaded VM.
```

## Risks
- The critical-path test ran on a loaded VM. If sdk-all.js loads faster elsewhere (cached, or a faster CPU), the UI build could become the gate. P1 and the condition below cover this.
- Keeping upstream code unchanged means no sync cost.

## What would change this verdict
- If P1 shows Ready moving by more than 70 % of the LoadDoc delay on a quiet VM: **refactor**, issuing `asc_LoadDocument` as soon as permissions allow and moving the UI build after it (ceiling ≈ 0.7 s).
- If sdkjs-word work makes sdk-all.js arrive or parse much earlier, so that LoadDoc waits on the UI and not on sdkjs: re-run P1 and reconsider the toolbar deferral (PKT-0111's code is on its fork branch).
- If a defect or crash is traced to this module's code (quality goal): refactor that path.
