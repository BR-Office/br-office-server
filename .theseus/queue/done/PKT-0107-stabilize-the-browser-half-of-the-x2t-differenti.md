---
id: PKT-0107
title: Stabilize the browser half of the x2t differential oracle
type: refactor
priority: medium
module: x2t
origin:
  type: plan
  ref: plan:x2t:dcb03039:r2:P1
depends_on: []
target:
  files:
  - .theseus/oracle/differential/x2t-run.cjs
  create_in:
  - .theseus/oracle/differential
  - tests/unit
context:
  cards:
  - x2t
  references:
  - .theseus/diagnosis/DIAG-x2t.md
contract:
  preserve:
  - Existing tests keep passing; their assertions change only where the goal requires it, and the log says why
  forbidden: []
requires:
- documentserver
- browser
estimated:
  files: 1
  diff_lines: 80
  source: planner
acceptance:
  commands:
  - bash .theseus/oracle/differential/x2t.sh
  - theseus validate
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
resume: false
---

## Goal
Make the browser part of x2t.sh stable when both sides run the same binary - the scripted local edit on text-10p.docx sometimes ends as "Local edit old" instead of "Local edit bold", producing 7 "original side itself unstable" differences (model, sentA, shown, saved, converted.pdf, converted.odt, reopened). Wait for the edit to be applied (model text check) before capturing; prove with two consecutive passing runs of x2t.sh.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-x2t.md` (row `P1`).
PKT-0103 run 1 in .theseus/oracle/rounds/x2t-r2.md. PKT-0094 already fixed a similar spell-check race with stableShown(). Do not add entries to x2t.intended to hide noise.

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.23.2, work kept
- Decision: bold is toggled with `editor.put_TextPrBold(true/false)` instead of Control+b. The key shortcut raced with typing, so "b" was sometimes lost ("Local edit old").
- Decision: added an `expect` step to `play()`. It polls a model predicate (up to 50 x 200 ms) and throws "scripted edit not applied" when it never holds, so a lost key now fails loudly instead of showing up as a random unstable side. Two expects on text-10p.docx: after "bold", and after the second line.
- No x2t.intended entries were added. No test assertions were changed.
- Proof: two consecutive runs of `bash .theseus/oracle/differential/x2t.sh` both ended in `x2t-browser: PASS (3 cases, 2 repeat(s) per side)` / `differential x2t: PASS`, with no "original side itself unstable" lines.
- Surprise: one full x2t.sh run takes about 5-6 min on this VM, so two runs do not fit in a single 600 s command.
- integration: the integration check failed once and passed on the rerun of the same tree (flaky oracle)

## Spawned packets

## Review
- Approved by claude-opus-5-5-b: bold toggled via editor API and edits gated by a model check before capture; contract kept, log complete

## Lessons for the Atlas
