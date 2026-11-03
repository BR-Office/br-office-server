---
id: PKT-0096
title: 'Build the differential oracle for web-apps: original against new'
type: characterize
priority: critical
module: web-apps-documenteditor
origin:
  type: plan
  ref: differential:web-apps
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
  - bash .theseus/oracle/differential/web-apps-documenteditor.sh
budget:
  max_files_changed: 8
  max_diff_lines: 1500
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
resume: false
---

## Goal
Write `.theseus/oracle/differential/web-apps-documenteditor.sh`: each compares the original code of web-apps (`external/web-apps.base`, the upstream code the fork was made from) with the new code (`external/web-apps`, the packet's branch with every change already merged into the fork) on the same inputs, as users meet them: open documents of each kind the module handles, apply scripted local edits and scripted remote (co-editing) changes, save, reopen, convert. It fails when the results differ (the saved document, what is shown, what is sent to other users), unless the difference is listed as intended in a file next to the script, and prints one timing line per case for both sides (original and new) so a reviewer sees the gain. Build each side where it can run for real (the editor in the browser against the running server; see `.theseus/adapter/environment.md`), caching builds by commit in `$THESEUS_CACHE_DIR`. It must pass now, with the changes already merged.

## Essential context
- Planned by `theseus plan` because the modules web-apps-documenteditor change web-apps through a fork and have no differential oracle. The factory runs `.theseus/oracle/differential/<module>.sh` last in the acceptance of every packet of these modules, and shows its output to the reviewer.
- `.theseus/oracle/baseline.md` records how earlier packets built and measured this code (for the editor: the webpack persistent cache must be cleared between builds).

## Suggested plan

## Executor log
- return: factory process stopped by the session's 2-hour limit; restarted on Theseus 0.21.3, work kept (TEP-0010)
- Resumed attempt (claude-opus-5-5, 2026-11-03): the oracle files from the first attempt were already committed (web-apps-documenteditor.sh, web-apps-build.sh, web-apps-run.cjs, .intended). First full run failed: `styles.docx reopened` gave 5 pages on the original side and 4 on the new, with identical content and identical code (both sides are commit d238e526).
- Decision: the reopened model was dumped right after open, while layout recalculation was still running. web-apps-run.cjs now dumps it after the canvas hash settles and polls until two dumps 500 ms apart agree. Not an intended difference, so nothing added to the .intended file.
- Result: `web-apps-documenteditor.sh` PASS (4 cases: text.docx, styles.docx, plain.txt, simple.rtf; one timing line per case for both sides); `documenteditor-open.sh` PASS.
- Surprise: the fork has no merged changes yet (original and new are the same commit), so the oracle currently proves only that it is stable on identical code; timing noise between sides is ±1-2 s per step on this 2-CPU VM.
- Not done: no conversion to formats other than TXT, and no perf/ script (create_in allows it; not needed for acceptance).

## Spawned packets

## Review
- Approved by claude-opus-5-5-b: oracle covers open/local+remote edits/save/reopen/convert with an intended-differences list, timing lines and cached builds; web-apps code untouched; flaky layout read fixed rather than listed as intended

## Lessons for the Atlas
