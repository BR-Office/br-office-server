---
id: PKT-0124
title: 'Build the differential oracle for web-apps: original against new'
type: characterize
priority: critical
module: web-apps-spreadsheeteditor
origin:
  type: plan
  ref: differential:web-apps:web-apps-spreadsheeteditor+web-apps-presentationeditor+web-apps-pdfeditor
depends_on: []
target:
  files: []
  create_in:
  - .theseus/oracle/differential
  - .theseus/oracle/perf
context:
  cards: []
  references:
  - .theseus/oracle/baseline.md
  - .theseus/adapter/environment.md
contract:
  preserve:
  - 'No change to the code of web-apps: this packet only builds the oracle'
  forbidden: []
allowed_commands:
- '*'
requires:
- documentserver
- browser
acceptance:
  commands:
  - bash .theseus/oracle/differential/web-apps-spreadsheeteditor.sh
  - bash .theseus/oracle/differential/web-apps-presentationeditor.sh
  - bash .theseus/oracle/differential/web-apps-pdfeditor.sh
budget:
  max_files_changed: 8
  max_diff_lines: 1500
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: null
  reviewer: null
---

## Goal
Write `.theseus/oracle/differential/web-apps-spreadsheeteditor.sh`, `.theseus/oracle/differential/web-apps-presentationeditor.sh`, `.theseus/oracle/differential/web-apps-pdfeditor.sh`: each compares the original code of web-apps (`external/web-apps.base`, the upstream code the fork was made from) with the new code (`external/web-apps`, the packet's branch with every change already merged into the fork) on the same inputs, as users meet them: open documents of each kind the module handles, apply scripted local edits and scripted remote (co-editing) changes, save, reopen, convert. It fails when the results differ (the saved document, what is shown, what is sent to other users), unless the difference is listed as intended in a file next to the script, and prints one timing line per case for both sides (original and new) so a reviewer sees the gain. Build each side where it can run for real (the editor in the browser against the running server; see `.theseus/adapter/environment.md`), caching builds by commit in `$THESEUS_CACHE_DIR`. It must pass now, with the changes already merged.

## Essential context
- Planned by `theseus plan` because the modules web-apps-documenteditor, web-apps-spreadsheeteditor, web-apps-presentationeditor, web-apps-pdfeditor change web-apps through a fork and have no differential oracle. The factory runs `.theseus/oracle/differential/<module>.sh` last in the acceptance of every packet of these modules, and shows its output to the reviewer.
- `.theseus/oracle/baseline.md` records how earlier packets built and measured this code (for the editor: the webpack persistent cache must be cleared between builds).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
