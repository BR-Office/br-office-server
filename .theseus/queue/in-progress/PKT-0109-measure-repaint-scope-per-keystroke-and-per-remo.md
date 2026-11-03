---
id: PKT-0109
title: Measure repaint scope per keystroke and per remote change in sdkjs word
type: investigate
priority: medium
module: sdkjs-word
origin:
  type: plan
  ref: plan:sdkjs-word:dcb03039:r2:P1
depends_on: []
target:
  files:
  - .theseus/oracle/baseline.md
  create_in:
  - .theseus/oracle/perf
context:
  cards:
  - sdkjs-word
  references:
  - .theseus/diagnosis/DIAG-sdkjs-word.md
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
  diff_lines: 400
  source: planner
acceptance:
  commands:
  - node --check .theseus/oracle/perf/word-repaint.js
  - grep -q "word-repaint" .theseus/oracle/baseline.md
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
Write .theseus/oracle/perf/word-repaint.js. With the fork build injected by Playwright routing (as PKT-0093, bundles from .theseus/oracle/differential/build.sh) on large-100p.docx, count per local keystroke and per remote change how many pages and rectangles are invalidated and redrawn (wrap the word DrawingDocument / CDocument redraw and OnRecalculatePage / UpdateTarget entry points), the canvas drawImage calls and the ms each takes, and the recalculation range (pages recalculated). Record the table in baseline.md and name the call sites that decide the redraw range, with the expected ceiling of limiting redraw to the changed page or lines.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-sdkjs-word.md` (row `P1`).
PKT-0043 found typing and remote apply repaint-dominated (drawImage 17-27 % self, Draw frames 33-57 % on stack). PKT-0093 shows the font fix took ≈ 7 % and repaint/recalc remain. Round 1 lesson - trace what actually runs before planning a fix (PKT-0087).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
