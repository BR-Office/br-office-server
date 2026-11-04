---
id: PKT-0111
title: Render hidden documenteditor toolbar tabs on first activation
type: refactor
priority: high
module: web-apps-documenteditor
origin:
  type: plan
  ref: plan:web-apps-documenteditor:dcb03039:r2:P1
depends_on: []
target:
  files:
  - external/web-apps/apps/documenteditor/main/app/controller/Toolbar.js
  - external/web-apps/apps/documenteditor/main/app/view/Toolbar.js
  - .theseus/oracle/baseline.md
  create_in:
  - .theseus/oracle/perf
  - tests/unit
context:
  cards:
  - web-apps-documenteditor
  references:
  - .theseus/diagnosis/DIAG-web-apps-documenteditor.md
contract:
  preserve:
  - Existing tests keep passing; their assertions change only where the goal requires it, and the log says why
  forbidden: []
allowed_commands:
- '*'
requires:
- documentserver
- browser
estimated:
  files: 3
  diff_lines: 300
  source: planner
acceptance:
  commands:
  - bash .theseus/oracle/documenteditor-open.sh
  - bash .theseus/oracle/differential/web-apps-documenteditor.sh
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
rejected_reviews: 2
---

## Goal
In Toolbar.onAppShowed/applyModeEditorElements, build only the Home tab's components; build Links, HeaderFooter, View, Review, Forms, Draw (and other hidden tabs) the first time they are activated or requested by a plugin/API. Measure before/after with perf/open-window.js (medium-10p and large-100p, 5 runs) and add the table to baseline.md; LoadDoc must drop by more than the run spread.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-web-apps-documenteditor.md` (row `P1`).
PKT-0047 measured Toolbar 252 ms self, ≈ 500 ms inclusive, before asc_LoadDocument; hidden tabs ≈ 70-90 ms. Keep the invariant that asc_LoadDocument runs after onEditorPermissions. Single-run timings vary ±0.7 s on identical code (rounds/web-apps-documenteditor-r2.md).

## Suggested plan

## Executor log
- claude-opus-5-5, 2026-11-03. Change in `external/web-apps` commit 9b58c858 (`controller/Toolbar.js` only; `view/Toolbar.js` untouched).
- **What was done.** `onAppShowed` now adds Draw, Header & Footer and (unless it is the viewer's initial active tab) View
  as tab headers with an empty placeholder panel (`addDeferredTab`), so tab order, captions, visibility and layout
  names are unchanged. Their panels are built by `buildDeferredTab(action)`, once, from whichever comes first: first
  activation (`tab:active:before`, before `setTab` filters `$panels`), an explicit call (plugins/API can call
  `buildDeferredTab`), a `setTimeout(0)` scheduled at the end of onAppShowed (asc_LoadDocument is issued synchronously
  after app:face, so this runs after it), or the start of `Toolbar.onAppReady`. Lock causes already on the toolbar
  (disableOnStart, lostConnect, ...) are copied onto the late controls. Forms, Review, Protect and Links stay eager.
- **Decisions.** (1) Not "build on first click": HeaderFooterTab.getPanel injects buttons into Insert-tab slots and
  ViewTab.getPanel injects zoom/fit buttons into toolbar slots, and the tab views' `onAppReady` walk controls created
  in getPanel (e.g. `btnsInsDateTime.forEach`). Building on click would strip Insert and crash at app:ready; fixing it
  needs HeaderFooterTab/ViewTab views (outside the target). So the floor is "after asc_LoadDocument, before app:ready".
  (2) Toolbar.onAppReady is registered in onLaunch, so it runs before the tab views' app:ready handlers (registered
  later); the forced build there keeps them safe. Residual risk: if app:ready arrived before the 0 ms timer (never
  seen; it needs the document download), views created in that forced build miss their own app:ready handler
  (Backbone does not fire handlers added mid-dispatch). (3) Review stays eager: Toolbar.onAppReady injects the
  comment button into `#review-changes-panel`.
- **Measurement** (baseline.md, "deferred hidden toolbar tabs"): CPU of the deferred tabs before LoadDoc ≈30-40 ms →
  ≈1 ms; large-100p LoadDoc 1 264 → 1 191 ms median of 15, inside the run spread; medium-10p 1 222 → 1 224 ms
  (sides in reversed order). **The Goal's bar (LoadDoc drop larger than the run spread) is not met.** Earlier medium
  pairs run before-first showed a fake 0.8-1.2 s drop that came from run order; it went away when the order was reversed. The bulk (Toolbar self ≈220 ms) is the Toolbar view's own template render: follow-up requested.
- **Surprises.** A differential run overlapping a perf run gave 2 "unintended" co-edit differences (model/sentB);
  run alone it passed 4/4. `documenteditor-open.sh` tests the *installed* bundle, not this change (the differential
  oracle is the one that loads it). open-window.js measures the installed app.js, so A/B means swapping files under
  /var/www (script kept in the session scratchpad, recipe in baseline.md).
- **Browser check.** The differential's `ui` compares only the visible DOM (Home tab), so it does not cover the
  deferred panels. A direct Playwright check with each build swapped in (setTab on draw/headerfooter/view/ins after load)
  gave the same tabs, panels and button counts on both sides, no placeholders left, the Header & Footer buttons still in
  Insert, no console errors. The "first activation" path is nominal in practice: the 0 ms timer always builds before any click.
- **Not done.** No unit test under tests/unit (needs the full editor; the check above was a one-off session script,
  not committed). Toolbar view panels not deferred (follow-up spawn request).
- **Attempt 2 (after rejection), claude-opus-5-5, 2026-11-03.** Retargeted to `view/Toolbar.js`: `rendererComponents`
  now injects only Home-panel components; components whose slot is in another template panel (ins, layout, links) are
  queued and rendered by `renderDeferredPanels(tab)` on first `setTab(tab)`, and for all panels at the start of
  view `onAppReady` and `createDelayedElements` (both after asc_LoadDocument; they touch cmpEl/hints).
  `btnContentControls` and `btnPageColor` stay eager: `onToolbarAfterRender` (render:after) builds their pickers only
  when rendered, and the controller binds `mnuControlsColorPicker` at launch (first build crashed on this; the
  differential caught it). Button objects are still created eagerly, so controller bindings/locks are unchanged
  (Button applies its stored disabled state at render).
- **Decision: controller `setTimeout(0)` kept.** Removing it moves the Draw/HeaderFooter/View build into the app:ready
  dispatch, where views created then would miss their own app:ready handler (Backbone captures handlers at trigger).
  The timer runs after asc_LoadDocument is issued, so it does not delay LoadDoc.
- **Measurement.** New paired script `perf/open-window-ab.js` (alternating order, route-served builds). LoadDoc
  per-pair diff: medium −60 ms [IQR −127, −19], large −100 ms [−182, +31]; Ready +28 / +85 ms. Profile:
  rendererComponents 55-205 ms. **The Goal's bar (drop > min-max run spread ≈300-500 ms) is not met and cannot be met
  by toolbar work alone** (Toolbar's whole pre-LoadDoc cost ≈220 ms). The paired median is the honest statistic.
- Acceptance: documenteditor-open PASS, differential PASS (4 cases). Functional tab check identical on both builds.
- Not done: no unit test (needs the full editor). Template parse of all panels (Toolbar.template, out of target) stays.
- **Attempt 3, claude-opus-5-5, 2026-11-03. No new code change; the Goal's bar is out of reach for this target.**
  Both rejections say the same thing: LoadDoc must drop by more than the run spread (≈300-600 ms). Attempt 1
  measured the Toolbar's whole pre-LoadDoc cost at ≈220 ms self / ≈500 ms inclusive. So even deleting the Toolbar
  outright would barely reach the spread, and lazy rendering cannot get there. What is left in the target is the
  `_.template(template)` render of all panels. The markup comes from `Toolbar.template`, which is outside
  `target.files`, so splitting it per panel is exactly the spawned follow-up (`.theseus/spawn/PKT-0111-defer-...`).
  A third rewrite inside the same files would only move the paired median by tens of ms again. I am not going to
  pretend that clears the bar.
- **What this packet still delivers.** Deferred Draw/HeaderFooter/View tab builds (controller) and deferred component
  injection for the non-Home panels (view). Paired-median LoadDoc −60 ms (medium) / −100 ms (large), Ready unchanged
  within noise. Acceptance re-run on this attempt: documenteditor-open PASS, differential PASS (see below).
- **Needs a decision outside the executor:** the planner/reviewer either restates the bar as "paired-median LoadDoc
  drop with IQR below 0" (met on medium: −60 [−127, −19]; not on large: [−182, +31]), or closes this packet as
  partial and folds the target into the spawned template-render follow-up. The executor cannot change the Goal.
- block: the reviewer found an external blocker: Goal's "LoadDoc drop > run spread" bar is unreachable within target (Toolbar's total pre-LoadDoc cost ≈ spread; remaining cost is in Toolbar.template, outside target) and attempts are exhausted — planner must restate the bar (e.g. paired-median drop) or widen the target via the spawned template follow-up.

## Spawned packets
- PKT-0125: Defer the documenteditor Toolbar view's own hidden panels (Insert, Layout, References) past asc_LoadDocument

## Review
- Rejected by claude-opus-5-5-b: LoadDoc does not drop by more than the run spread (1264→1191 ms against a ≈300–600 ms spread, medium-10p unchanged) and the hidden tabs are still built at startup; the real cost is in view/Toolbar.js panel drawing, so retarget or rely on the spawned follow-up
- Rejected by claude-opus-5-5-b: Goal's bar (LoadDoc drop > run spread) not met (−60/−100 ms vs ≈300–500 ms spread); planner must restate the bar as paired-median drop or fold the target into the spawned template-render follow-up

## Lessons for the Atlas
