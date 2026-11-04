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
rejected_reviews: 1
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
- attempt 2 (claude-opus-5-5, 2026-11-04): reused the fork commit 0fc7c875 (view/Toolbar.js only, fast-forwarded
  from fork/pkt/PKT-0125: the local branch had been reset to base). It queues components whose slot is inside a
  non-Home `section.panel` and injects them on first `tab:active:before`, a 0 ms timer after render, onAppReady or
  createDelayedElements, whichever comes first. btnContentControls and btnPageColor stay eager: their pickers are
  built on render:after and bound by the controller at launch.
- Checked ordering: in edit mode Main.applyModeEditorElements triggers app:face (Toolbar.onAppShowed, then render),
  and the same synchronous stack ends with asc_LoadDocument (Main.js ~1853), so the 0 ms timer fires after LoadDoc.
- Measurement, as the review asked: new perf/toolbar-ab.sh swaps base/new built app.js into the installed server and
  alternates sides per block (5 blocks x 3 runs = 15 opens per side per file), with retry on an "editor not ready"
  timeout and resume. perf/toolbar-ab-summary.py prints the table. Raw data in perf/toolbar-ab-2026-11-04/.
  Results in baseline.md (PKT-0125 section).
- Result, stated plainly: ctlCode.LoadDoc.Toolbar −51 ms on medium-10p (5/5 blocks lower; p25–p75 spread 48/42 ms)
  and −39 ms on large-100p (3/5 blocks; spread 51 ms). The goal's bar (drop > run spread) is met on medium against
  p25–p75 only, and NOT met on large-100p. The LoadDoc mark and Ready do not move beyond noise. Busy CPU before
  LoadDoc falls 34/44 ms.
- Surprise: most of the Toolbar's ~200 ms is not the hidden panels' injection but `initialize` (75 Buttons plus
  pickers for every tab, built before render). Requested a follow-up (spawn: construct non-Home buttons lazily) that
  must move the controllers' launch-time bindings.
- Not changed: HeaderFooterTab.js, ViewTab.js and controller/Toolbar.js. Their injection targets slots in the
  template, which exist before their panel's components are injected, so they keep working. Deferring them too would
  save only ~10–20 ms (their ctlCode before LoadDoc).
- Load: the first A/B (06:08–06:22) ran alongside another packet's x2t run (load 5–9) and was noise dominated, and
  one open timed out. Re-ran from 06:27 after waiting for no other packet and load < 2; another packet started
  partway through (load 3–5).
- Acceptance: differential PASS (4 cases). documenteditor-open PASS on the installed build, and PASS again with the
  new app.js swapped in temporarily (the installed app.js was restored and checked with cmp).

- attempt 3 (claude-opus-5-5, 2026-11-04): construction deferred too, as the review asked. view/Toolbar.js wraps
  the four Insert/Layout construction blocks of applyLayout in place in `deferControls(names, factory)` (no
  re-indent, to stay in budget). Each name is a getter until `buildDeferredControls` runs, so an early reader still
  gets the component. That function runs the factories, pushes the new controls into lockControls and LayoutManager,
  fires `controls:deferred`, and replays the `lockToolbar` calls made before the build (`_lockLog`; e.g.
  disableOnStart). rendererComponents passes deferred components by name and queues their slots. The page-break
  buttons are deferred as well. The mnuInsertTable/mnuPageSize/mnuColorSchema aliases and the image-button pushes
  move into their blocks.
- HeaderFooterTab.getPanel builds its buttons for the Toolbar's Insert slots on `controls:deferred`. Ids keep the
  base order (Toolbar slot -0, own slot -1). The order inside the ButtonSet changes (own first).
- ViewTab.js not changed: in this base it injects nothing into Toolbar slots (only its own panel). controller/Toolbar.js
  not changed: attachUIEvents already runs in createDelayedElements, after load.
- Surprises: (1) render's `setTab('home')` fires tab:active:before; reacting to it ran the whole build before
  LoadDoc, and the first A/B (aborted) showed no Toolbar drop. Fixed: the handler ignores 'home'.
  (2) render calls onUpdateLastCustomMargins, which reads btnPageMargins and forced the build through the getter;
  it is now queued as a deferred step. A getter warning only showed (2), and only after console capture was
  replaced by a window array. Production builds swallow console.warn from the editor frame in my probe.
- Verified: a probe shows the build is triggered by the timer 10–20 ms after the asc_LoadDocument call. A Playwright
  pass on base vs new shows identical visible-control and disabled counts and identical non-generated ids per tab
  (home, ins, layout, links, view). No page errors.
- Result (baseline.md, attempt 3 table): Toolbar −50 ms medium, −72 ms large, above the p25–p75 spread on both and
  5/5 blocks each. Busy CPU −46/−53 ms is not above its spread. The load was 3.4–4.8 during the run (another
  executor session was alive); I did not wait for a fully idle VM.
- Acceptance: differential PASS (4 cases), documenteditor-open PASS on the installed build and with the new
  app.js swapped in (restored, checked with cmp).
- Spawn request rewritten: the HeaderFooterTab and ViewTab panels after LoadDoc. The Insert/Layout construction
  part of the attempt-2 request is done here.

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: re-run perf/open-window.js (medium-10p, large-100p, 15 runs) when no other packet is using the machine and show the ctlCode.LoadDoc.Toolbar drop is larger than its run spread in baseline.md; the current 51–93 ms drop is within 300–900 ms of noise

## Lessons for the Atlas
- web-apps-documenteditor: in view/Toolbar.js the cost before LoadDoc is mostly component construction in
  `initialize`, not DOM injection in rendererComponents. Deferring injection alone saves ~40–55 ms of ~200 ms.
- ctlCode only counts samples under a controller frame, so work moved into a bare timer drops out of it in every
  window. Check total busy CPU before LoadDoc as well.
- A/B of a web-apps build: alternate sides per block (perf/toolbar-ab.sh). One packet's x2t run on the 2-CPU VM
  doubles the run spread.
