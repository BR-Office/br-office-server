---
id: SPAWN
title: Build the documenteditor HeaderFooterTab and ViewTab panels after asc_LoadDocument
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
    - external/web-apps/apps/documenteditor/main/app/controller/Toolbar.js
    - external/web-apps/apps/documenteditor/main/app/view/HeaderFooterTab.js
    - external/web-apps/apps/documenteditor/main/app/view/ViewTab.js
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
Build the Header & Footer and View tab panels (HeaderFooterTab.getPanel, ViewTab.getPanel and the tab views'
initialize-time components) after asc_LoadDocument is issued or on first activation of their tab, whichever comes
first, with placeholder panels in controller/Toolbar.js onAppShowed. Measure with perf/toolbar-ab.sh (medium-10p and
large-100p, 5x3 runs per side, idle VM) and add the table to baseline.md; ctlCode.LoadDoc.Toolbar must drop by more
than its p25-p75 spread.

## Essential context
PKT-0125 (attempt 3) now constructs the Toolbar view's Insert/Layout components lazily (view/Toolbar.js
deferControls / buildDeferredControls, run by a 0 ms timer after render, i.e. after asc_LoadDocument, on tab
activation, app:ready or createDelayedElements) and HeaderFooterTab's buttons in the Insert slots with them
(Toolbar event `controls:deferred`). What is still built before LoadDoc under the Toolbar controller: the Home panel,
the template, and the HF/View tab views' own panels (created in onAppShowed via createToolbarPanel). PKT-0111's
addDeferredTab/buildDeferredTab is not in this base. Constraints: onAppShowed pushes getButtons() of both views into
toolbar.lockControls right after createToolbarPanel (push them again when built, and replay locks as
buildDeferredControls does); the tab views' onAppReady walk controls built in getPanel, so builds must finish before
app:ready (the Toolbar view's onAppReady runs first). ViewTab injects nothing into Toolbar slots in this base.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
