---
id: PKT-0115
title: Decide the port of upstream fix 81576 with a test plan
type: investigate
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:r2:P3
depends_on: []
target:
  files: []
  create_in:
  - .theseus/diagnosis
context:
  cards:
  - docservice
  references:
  - .theseus/diagnosis/DIAG-docservice.md
contract:
  preserve:
  - Existing tests keep passing; their assertions change only where the goal requires it, and the log says why
  forbidden: []
estimated:
  files: 1
  diff_lines: 120
  source: planner
acceptance:
  commands:
  - test -s .theseus/diagnosis/PKT-81576-test-plan.md
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Write .theseus/diagnosis/PKT-81576-test-plan.md describing how SaveVersion is released after a failed final assembly in commit 8585bcf4, which save-state semantics it changes, and the characterization tests needed before porting, for a human decision.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P3`).
PKT-0029 rated it medium risk; patch in .theseus/diagnosis/PKT-0029-upstream-81576.patch; shutdown.js waits for SaveVersion rows to reach 0.

## Suggested plan

## Executor log
- 2026-11-04 claude-opus-5-5: wrote .theseus/diagnosis/PKT-81576-test-plan.md from the upstream patch and EO main code (canvasservice.js commandSfcCallback l.1026-1305, shutdown.js l.73, DocsCoServer.endAuth l.3226-3264).
- Decision: static analysis only; no code run, no tests written (packet is investigate, target.files empty). Line numbers are EO main at 4434daa.
- Surprise: on EO main an ACKed `Corrupted` callback for a non-corrupted assembly error is treated as a successful save and pending changes are deleted (plan T3). So 81576 removes a data-loss path, not only the shutdown hang. PKT-0029 did not mention this.
- Surprise: retry is disabled during shutdown (`!getIsShutdown()`), which is why shutdown itself creates the stuck SaveVersion row.
- Gap noted, not fixed by upstream: CONVERT_CORRUPTED + no ACK + no retry still leaves SaveVersion (T9).
- Spawned: characterization-tests request in .theseus/spawn/ (tests/unit, cases T1-T9, E1-E5, S1-S2).
- Not done: end-to-end check (section 5) left for the port packet.
- Rework after rejection: canvasservice.js l.1306 stores the forgotten file only when `!isError || isErrorCorrupted`. Corrected T4, T6, the §3 no-ACK row, the §3 bullet and E4: an unACKed non-corrupted error gets no forgotten copy and no clean-up; marker and forgotten file cannot come from the same save (E4 now = stale forgotten from an earlier save).

## Spawned packets
- .theseus/spawn/PKT-0115-characterization-tests-for-commandsfccallback-en.md

## Review

## Lessons for the Atlas
- docservice: commandSfcCallback treats any callback ACK as save success, even on assembly error other than CONVERT_CORRUPTED; shutdown.js waits on SaveVersion row count, so any path restoring SaveVersion without retry can hang prepare4shutdown.
