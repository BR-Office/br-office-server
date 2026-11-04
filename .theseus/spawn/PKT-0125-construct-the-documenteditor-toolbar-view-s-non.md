---
id: SPAWN
title: Construct the documenteditor Toolbar view's non-Home buttons lazily instead of in initialize
type: refactor
priority: medium
module: web-apps-documenteditor

origin:
  type: packet
  ref: PKT-0125

depends_on: []

requires: [documentserver, browser]

target:
  files:
    - external/web-apps/apps/documenteditor/main/app/view/Toolbar.js
    - external/web-apps/apps/documenteditor/main/app/controller/Toolbar.js
    - external/web-apps/apps/documenteditor/main/app/controller/Main.js
    - .theseus/oracle/baseline.md
  create_in:
    - .theseus/oracle/perf

context:
  cards: [web-apps-documenteditor]
  references:
    - .theseus/queue/in-progress/PKT-0125-defer-the-documenteditor-toolbar-view-s-own-hidd.md
    - .theseus/oracle/perf/toolbar-ab.sh

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
  executor: null
  reviewer: null
---

## Goal
Construct the Insert, Layout and References buttons and pickers of view/Toolbar.js (built in `initialize`,
before render) on first need: after asc_LoadDocument is issued, on first activation of their tab, or at app:ready,
whichever comes first. Measure with perf/toolbar-ab.sh (medium-10p and large-100p, 5x3 runs per side, on an idle VM)
and add the table to baseline.md; ctlCode.LoadDoc.Toolbar and busy CPU before LoadDoc must drop by more than their
p25-p75 spread.

## Essential context
PKT-0125 deferred only the DOM injection of the non-Home panels' components (rendererComponents): Toolbar self
time before LoadDoc fell ~40-55 ms of ~200 ms (baseline.md, PKT-0125 section). The rest is `initialize`
(75 `new Common.UI.Button` plus pickers for every tab), the template parse and the Home panel. Blocker: the
controllers (controller/Toolbar.js onLaunch/attachUIEvents, controller/Main.js applyModeEditorElements) bind
handlers to these button objects at launch, so their construction cannot be deferred without moving those bindings
(e.g. into a per-tab hook, or binding through the toolbar's events). HeaderFooterTab/ViewTab inject buttons into
Insert/View slots (see PKT-0111); the slots exist in the template before their panel renders.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
