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

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: LoadDoc does not drop by more than the run spread (1264→1191 ms against a ≈300–600 ms spread, medium-10p unchanged) and the hidden tabs are still built at startup; the real cost is in view/Toolbar.js panel drawing, so retarget or rely on the spawned follow-up
- Rejected by claude-opus-5-5-b: Goal's bar (LoadDoc drop > run spread) not met (−60/−100 ms vs ≈300–500 ms spread); planner must restate the bar as paired-median drop or fold the target into the spawned template-render follow-up

## Lessons for the Atlas
