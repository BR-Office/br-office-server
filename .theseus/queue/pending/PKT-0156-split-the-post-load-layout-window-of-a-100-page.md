---
id: PKT-0156
title: Split the post-load layout window of a 100-page docx open in sdkjs word
type: investigate
priority: medium
module: sdkjs-word
origin:
  type: plan
  ref: plan:sdkjs-word:dcb03039:r3:P1
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
  files: 2
  diff_lines: 350
  source: planner
acceptance:
  commands:
  - node --check .theseus/oracle/perf/word-layout-window.js
  - grep -q "word-layout-window" .theseus/oracle/baseline.md
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
Write .theseus/oracle/perf/word-layout-window.js. On open-docx-100p (sample .theseus/oracle/journeys/open-docx-100p.docx, fork bundle injected as word-repaint.js does), from isDocumentLoadComplete to the end of layout, record each timer slice of CDocument.ContinueRecalculationLoop / Recalculate_Page (pages per slice, ms per slice, idle ms between slices and the timer interval used), the paint calls in the window, and the key-to-frame latency of a keystroke sent at 100 ms and 500 ms into the window. Report in baseline.md the split compute / idle / paint, the call sites deciding slice size and interval, and the ceiling of removing idle gaps, enlarging slices and yielding to input, each in ms of the 1 250 ms stage.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-sdkjs-word.md` (row `P1`).
Round 3 journey open-docx-100p gives layout-finish-paint 1 250 ms (27 % of 4 628), the largest sdkjs-word stage; typing/co-edit levers are already queued (PKT-0144, PKT-0145) and client-open-word is profiled by PKT-0133. Lesson from rounds 1-2 - measure the ceiling and trace what actually runs before writing a fix.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
