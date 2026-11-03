---
id: DIAG-web-apps-documenteditor
module: web-apps-documenteditor
verdict: refactor
target_language: null
confidence: medium
conditional_on: null
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: d238e526
round: 2
wave: 0
---

## Summary
**Refactor (UI build on open), now unconditional.** Round 1 measured and built oracles but changed no code, so it delivered no speed. Its measurement met the round 1 condition: ≈ 0.9 s of the ≈ 1.1 s busy before `asc_LoadDocument` is web-apps (round 2 re-measured: same split), well above the 200 ms keep threshold, with the toolbar build (≈ 0.25 s self, ≈ 0.5 s inclusive) and Comments launch (≈ 0.1 s) the largest single items. Round 2 defers what the first screen does not show, in JavaScript, gated by the two oracles that now exist.

## What round 1 proved and what it did not
| Packet | Delivered | Gain toward the goal |
|---|---|---|
| PKT-0047 split | Open window split: pre-document ≈ 1.4 s is web-apps UI, not sdkjs; Toolbar 252, Comments 116, Main 80, Viewport 68 ms | measurement only |
| PKT-0048 open oracle | `documenteditor-open.sh` (open, type, save, marker in docx): PASS, oracle `partial` | none (enables change) |
| PKT-0096 differential | `differential/web-apps-documenteditor.sh`: PASS on 4 cases, but original = new (`d238e526`), so it proved only stability | none (enables change) |
Not delivered: any reduction of open time. No code change was planned in round 1.

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Goal: speed, open | LoadDoc 1.20–1.25 s, Ready 3.3–3.9 s (unprofiled p50); web-apps ≈ 0.9 s busy before LoadDoc (vendor/jQuery 0.4, DE 0.15, common 0.15–0.17, parse 0.17–0.22) | rounds/web-apps-documenteditor-r2.md; baseline.md PKT-0047 |
| Goal: where to cut | Toolbar render after `onEditorPermissions → onAppShowed` (`Common.Utils.injectComponent`, `getWidthOfCaption`, jQuery DOM) and Comments `onLaunch`; hidden tabs (Links, HeaderFooter, View, Review, Forms, Draw) ≈ 70–90 ms; estimate 0.3–0.4 s | baseline.md PKT-0047 controller launch; `controller/Toolbar.js:3899` |
| Goal: what is not here | The post-Editor.bin 2.1–2.7 s is sdk-all.js parse, fonts, layout (sdkjs, DIAG-sdkjs-word); lazy-loading controller *code* saves < 0.1 s | baseline.md PKT-0047 reading |
| Quality risk | Deferral touches the open-order invariants (sdk first, `asc_LoadDocument` after `onEditorPermissions`) and plugins that expect tabs present | card Invariants |
| Oracle (D1) | `partial`: open/type/save oracle plus differential original vs new (dialogs, model, ui, reopen, convert); noise ±0.7 s per single open | rounds r2 |
| Target language | None: DOM/jQuery-bound UI; no language gains speed here | card; goals.preferred_languages |

## Discarded alternatives
- **keep**: ≈ 0.3–0.4 s of a ≈ 1.3 s pre-document window is reachable in this module; keep forgoes it.
- **migrate / rewrite**: the cost is DOM building, not computation; the external contract would remain. No gain.
- **retire**: live editor UI.

## Path of change
Same language, in `external/web-apps` (fork branch). P1 renders the hidden toolbar tabs on first activation instead of in `onAppShowed`. P2 defers Comments' panel/build until the document is ready or the panel is opened. Each is gated by both oracles and by a before/after of `perf/open-window.js` (5 runs, two files) recorded in baseline.md; a change that does not move LoadDoc by more than the run-to-run spread counts as not delivered. P3 then removes jQuery work in the toolbar caption measuring (`getWidthOfCaption`) if P1 leaves the toolbar above 150 ms self.

## Initial packet plan
| Key | Wave | Type | Title |
|---|---|---|---|
| P1 | 0 | refactor | Render hidden documenteditor toolbar tabs on first activation |
| P2 | 0 | refactor | Defer the Comments build until after document load |
| P3 | 1 | refactor | Cut toolbar caption width measuring on open |

```yaml
packets:
  - key: P1
    wave: 0
    type: refactor
    title: Render hidden documenteditor toolbar tabs on first activation
    files: [external/web-apps/apps/documenteditor/main/app/controller/Toolbar.js, external/web-apps/apps/documenteditor/main/app/view/Toolbar.js, .theseus/oracle/baseline.md]
    create_in: [.theseus/oracle/perf]
    depends_on: []
    allowed_commands: ["*"]
    requires: [documentserver, browser]
    estimate: {files: 3, diff_lines: 300}
    acceptance:
      - bash .theseus/oracle/documenteditor-open.sh
      - bash .theseus/oracle/differential/web-apps-documenteditor.sh
    goal: In Toolbar.onAppShowed/applyModeEditorElements, build only the Home tab's components; build Links, HeaderFooter, View, Review, Forms, Draw (and other hidden tabs) the first time they are activated or requested by a plugin/API. Measure before/after with perf/open-window.js (medium-10p and large-100p, 5 runs) and add the table to baseline.md; LoadDoc must drop by more than the run spread.
    context: PKT-0047 measured Toolbar 252 ms self, ≈ 500 ms inclusive, before asc_LoadDocument; hidden tabs ≈ 70-90 ms. Keep the invariant that asc_LoadDocument runs after onEditorPermissions. Single-run timings vary ±0.7 s on identical code (rounds/web-apps-documenteditor-r2.md).
  - key: P2
    wave: 0
    type: refactor
    title: Defer the Comments build until after document load
    files: [external/web-apps/apps/common/main/lib/controller/Comments.js, .theseus/oracle/baseline.md]
    create_in: [.theseus/oracle/perf]
    depends_on: [P1]
    allowed_commands: ["*"]
    requires: [documentserver, browser]
    estimate: {files: 2, diff_lines: 200}
    acceptance:
      - bash .theseus/oracle/documenteditor-open.sh
      - bash .theseus/oracle/differential/web-apps-documenteditor.sh
    goal: Move the ≈ 0.1 s of Comments onLaunch work (view/panel build) to after document load or first use, keeping comment callbacks from the sdk queued and applied. Before/after with perf/open-window.js into baseline.md.
    context: PKT-0047 Comments 116/96 ms, ≈ 90-100 ms inside onLaunch. Comments.js is in apps/common, shared with other editors; the differential checks only documenteditor, so do not change behaviour for the others.
  - key: P3
    wave: 1
    type: refactor
    title: Cut toolbar caption width measuring on open
    files: [external/web-apps/apps/common/main/lib/component/Button.js, external/web-apps/apps/documenteditor/main/app/view/Toolbar.js, .theseus/oracle/baseline.md]
    create_in: [.theseus/oracle/perf]
    depends_on: [P1]
    allowed_commands: ["*"]
    requires: [documentserver, browser]
    estimate: {files: 3, diff_lines: 200}
    acceptance:
      - bash .theseus/oracle/documenteditor-open.sh
      - bash .theseus/oracle/differential/web-apps-documenteditor.sh
    goal: If after P1 the toolbar still costs > 150 ms self before LoadDoc, replace per-button jQuery caption width measuring (getWidthOfCaption) with a batched or cached measurement. Before/after with perf/open-window.js into baseline.md.
    context: PKT-0047 inclusive toolbar profile is mostly injectComponent, getWidthOfCaption and jQuery DOM work; vendor jQuery is ≈ 0.4 s self before LoadDoc.
```

## Risks
- Plugins or the host API that address toolbar components before their tab is built; P1 must build on demand.
- VM noise (±0.7 s single open) hides gains; only multi-run open-window.js counts.
- Upstream sync with ONLYOFFICE web-apps: keep the changes small and local.

## What would change this verdict
- If P1 and P2 together move LoadDoc by less than 150 ms (p50, 5 runs), stop here and move to **keep**: the remaining time is jQuery/DOM inherent to this UI.
- If moving LoadDoc earlier does not move Ready (document waits on sdk-all.js download/parse), the gain is not felt: redirect to sdkjs bundle loading (DIAG-sdkjs-word).
- If the differential shows regressions that the deferral cannot avoid, keep.
