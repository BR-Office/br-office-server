---
id: PKT-0125
title: Defer the documenteditor Toolbar view's own hidden panels (Insert, Layout, References) past asc_LoadDocument
type: refactor
priority: medium
module: web-apps-documenteditor

origin:
  type: packet
  ref: PKT-0111

depends_on: []

requires: [documentserver, browser]

target:
  files:
    - external/web-apps/apps/documenteditor/main/app/view/Toolbar.js
    - external/web-apps/apps/documenteditor/main/app/controller/Toolbar.js
    - external/web-apps/apps/documenteditor/main/app/view/HeaderFooterTab.js
    - external/web-apps/apps/documenteditor/main/app/view/ViewTab.js
    - .theseus/oracle/baseline.md
  create_in:
    - .theseus/oracle/perf

context:
  cards: [web-apps-documenteditor]
  references:
    - .theseus/queue/in-progress/PKT-0111-render-hidden-documenteditor-toolbar-tabs-on-first-activation.md
    - .theseus/diagnosis/DIAG-web-apps-documenteditor.md

contract:
  preserve:
    - "Tab order, captions, visibility and the toolbar buttons each tab shows stay the same"
    - "asc_LoadDocument still runs after onEditorPermissions"
  forbidden: []

acceptance:
  commands:
    - bash .theseus/oracle/documenteditor-open.sh
    - bash .theseus/oracle/differential/web-apps-documenteditor.sh

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
rejected_reviews: 2
resume: false
---

## Goal
In view/Toolbar.js render only the Home panel's components before asc_LoadDocument; build the Insert, Layout and References panels (and the cross-injected HeaderFooterTab/ViewTab buttons) after asc_LoadDocument is issued or on first activation, whichever comes first. Measure before/after with perf/open-window.js (medium-10p and large-100p, 15 runs) and add the table to baseline.md; ctlCode.LoadDoc.Toolbar must drop by more than its run spread.

## Essential context
PKT-0111 deferred the controller-built tabs (Draw, Header & Footer, View) with placeholder panels in
controller/Toolbar.js (addDeferredTab/buildDeferredTab). That removed only ~30-40 ms CPU before LoadDoc; the
Toolbar's self time (~220-250 ms, ctlCode.LoadDoc.Toolbar in perf/open-window.js) is the Toolbar view's own
rendererComponents, which builds every panel of its template (Insert, Layout, References...) in render().
Blockers found by PKT-0111: HeaderFooterTab.getPanel injects buttons into Insert-tab slots
(.slot-headerfooter, .slot-pagenumbers, .slot-insertdatetime, .slot-insertfield, .slot-insertimage) and
ViewTab.getPanel injects zoom/fit buttons into toolbar slots, so those panels cannot be built on first click
without moving that injection; tab views' onAppReady walk controls created in getPanel, so builds must finish
before app:ready (Toolbar.onAppReady runs first: it is registered in onLaunch).
Measure with perf/open-window.js on medium-10p/large-100p, 15 runs per side, sides run back to back with nothing
else on the VM (PKT-0111 saw a 1 s bimodal LoadDoc spread with 5 runs).

## Suggested plan

## Executor log
- return: factory stopped by the 2-hour session limit

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: re-run perf/open-window.js (medium-10p, large-100p, 15 runs) when no other packet is using the machine and show the ctlCode.LoadDoc.Toolbar drop is larger than its run spread in baseline.md; the current 51–93 ms drop is within 300–900 ms of noise
- Rejected by claude-opus-5-5-b: ctlCode.LoadDoc.Toolbar drops only 39 ms on large-100p against a 51 ms spread (new build lower in 3/5 blocks), so the goal's "drop > run spread" bar isn't met, and the HeaderFooterTab/ViewTab buttons the goal names weren't deferred; button creation must be deferred too (the requested follow-up's scope) to get a drop above the spread on both files

## Lessons for the Atlas
