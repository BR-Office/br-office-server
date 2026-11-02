---
id: PKT-0048
title: Establish an open-sequence oracle for the documenteditor shell
type: characterize
priority: medium
module: web-apps-documenteditor
origin:
  type: plan
  ref: plan:web-apps-documenteditor:dcb03039:P2
depends_on: []
target:
  files:
  - .theseus/atlas/web-apps-documenteditor.md
  create_in:
  - .theseus/oracle
context:
  cards:
  - web-apps-documenteditor
  references:
  - .theseus/diagnosis/DIAG-web-apps-documenteditor.md
contract:
  preserve:
  - Existing tests keep passing unchanged
  forbidden: []
allowed_commands:
- '*'
acceptance:
  commands:
  - .theseus/oracle/unit.sh
  - npm run lint:check
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5-b
  reviewer: claude-opus-5-5
---

## Goal
Run external/web-apps/test/documenteditor/main headless if possible and add a Playwright check (open docx, toolbar present, type, save callback status 2). Write a wrapper under .theseus/oracle, record pass/fail and duration, and set the card's oracle level and sources.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-web-apps-documenteditor.md` (row `P2`).
The card's oracle is none; lazy-loading refactors touch the open-order invariants (sdk first, asc_LoadDocument after onEditorPermissions).

## Suggested plan

## Executor log
- Added `.theseus/oracle/documenteditor-open.sh` + `documenteditor-open-run.cjs`: Playwright (global install, `/opt/pw-browsers` Chromium) against the running native server's `/example/`. Phases: toolbar, load mask detached, type marker, close page, wait for file rewrite (= callback status 2 handled by the example), unzip and grep the marker.
- Results (native package, 2 CPU VM): PASS 3/3, total 11.2–11.5 s; toolbar 1.1–1.3 s, loaded 1.2–2.9 s, typed ~5.2 s, saved ~11.2 s. Negative run with an unreachable URL: FAIL, exit 1.
- Decision: status 2 is observed indirectly (example's stored file mtime changes, plus marker in the saved docx) instead of running a custom callback server, to avoid JWT setup; the marker check makes it a stronger proof than mtime alone.
- Decision: card oracle level set to `partial` (smoke only; no controller-order assertions).
- Surprise: `test/documenteditor/main` is a manual viewer page with no assertions and needs dev sdkjs scripts; not adopted. Clicking `#id_viewer` fails (overlay canvas + load mask intercept); click `#id_viewer_overlay` after the mask is gone.
- Surprise: eslint ignores `.theseus/`, so `npm run lint:check` does not lint the runner.
- Not done: the oracle is not part of the acceptance set (it needs the running stack); the check tests the deployed `/var/www` build, not the `external/web-apps` checkout. Each run leaves a `new (N).docx` in the example store.

## Spawned packets

## Review
- Approved by claude-opus-5-5: Headless open/type/save oracle checks the typed marker in the saved file; card set honestly to partial; within target and budget

## Lessons for the Atlas
