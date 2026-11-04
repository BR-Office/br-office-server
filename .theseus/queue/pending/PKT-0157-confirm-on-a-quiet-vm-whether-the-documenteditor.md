---
id: PKT-0157
title: Confirm on a quiet VM whether the documenteditor UI build is on the open critical path
type: investigate
priority: medium
module: web-apps-documenteditor
origin:
  type: plan
  ref: plan:web-apps-documenteditor:dcb03039:r3:P1
depends_on: []
target:
  files: []
  create_in:
  - .theseus/oracle/perf
  - .theseus/oracle/rounds
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
  files: 2
  diff_lines: 120
  source: planner
acceptance:
  commands:
  - test -s .theseus/oracle/perf/loaddoc-delay.js
  - test -s .theseus/oracle/rounds/web-apps-documenteditor-r3-critical-path.md
  - grep -q "dReady" .theseus/oracle/rounds/web-apps-documenteditor-r3-critical-path.md
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: null
  reviewer: null
---

## Goal
Commit the script from rounds/web-apps-documenteditor-r3.md as .theseus/oracle/perf/loaddoc-delay.js. On an idle VM (load < 1.5; record it), run it with 0, 300 and 800 ms delays, 15 alternating pairs each, on medium-10p.docx and large-100p.docx. Write the paired B-A Ready medians and IQR to .theseus/oracle/rounds/web-apps-documenteditor-r3-critical-path.md. Also record the gap between the end of the sdk-all.js download and the start of LoadDoc. State which of these holds - (a) Ready moves less than 30 % of the delay, so keep stands; (b) Ready moves more than 70 %, so request a refactor packet that issues asc_LoadDocument before the toolbar/comments build.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-web-apps-documenteditor.md` (row `P1`).
Round 3 measured it under load 10-13. Delays of +526 and +207 ms moved Ready by +147 and -729 ms (spread ±1.2 s). LoadDoc coincided with the end of the sdk-all.js download. Run it as an exclusive packet; PKT-0112/0132 lost attempts to a loaded VM.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
