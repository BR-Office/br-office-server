---
id: PKT-0132
title: Wire the Toolbar to the Comments add button lazily so the deferred Comments build leaves the open window
type: refactor
priority: high
module: web-apps-documenteditor

origin:
  type: packet
  ref: PKT-0112

depends_on: [PKT-0112]

target:
  files:
    - external/web-apps/apps/documenteditor/main/app/controller/Toolbar.js
    - external/web-apps/apps/common/main/lib/controller/Comments.js
    - .theseus/oracle/baseline.md
  create_in:
    - .theseus/oracle/perf

context:
  cards: [web-apps-documenteditor]
  references:
    - .theseus/diagnosis/DIAG-web-apps-documenteditor.md

contract:
  preserve:
    - "Comments panel, Add-comment toolbar button locks and sdk comment callbacks behave as before (differential oracle passes)"
  forbidden: []

acceptance:
  commands:
    - "bash .theseus/oracle/documenteditor-open.sh"
    - "bash .theseus/oracle/differential/web-apps-documenteditor.sh"

requires: [documentserver, browser]

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
PKT-0112 defers the Comments view build (`view.render()`) out of `onLaunch` in the document editor. But `Toolbar.onAppReady`
(Toolbar.js ≈ l. 4076) reads `comments.getView().buttonAddNew` inside `Main.onDocumentContentReady` → `app:ready`, which forces
the build synchronously there. Make the Toolbar register `buttonAddNew` (locks, `btnsComment.add`) when the Comments view is
actually built, e.g. on a notification Comments.js triggers after its deferred render, so the build runs after
`isDocumentLoadComplete` (idle callback or first use). Measure LoadDoc/Ready before/after with
`.theseus/oracle/perf/open-window-build.js` on an idle VM, as paired deltas (B − A per iteration), and write them to baseline.md.

## Essential context
- baseline.md section "Comments build deferred in the document editor, A/B (PKT-0112)": a pooled −25 ms LoadDoc, Ready unchanged, with the mechanism.
- Comments.js is shared with other editors: keep the change gated to the document editor (`appPrefix === 'de-'`).

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.24.2 (quiet journey measurement)

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: perf gain is within run-to-run spread and wasn't measured on an idle VM; the late-wired buttonAddNew is missing from toolbar.lockControls/paragraphControls (lock behavior changed). Add it to those arrays, test locks applied after load, and remeasure on an idle VM

## Lessons for the Atlas
