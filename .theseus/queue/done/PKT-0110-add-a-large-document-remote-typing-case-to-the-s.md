---
id: PKT-0110
title: Add a large-document remote typing case to the sdkjs-word differential oracle
type: characterize
priority: medium
module: sdkjs-word
origin:
  type: plan
  ref: plan:sdkjs-word:dcb03039:r2:P2
depends_on: []
target:
  files:
  - .theseus/oracle/differential/run.cjs
  - .theseus/oracle/differential/sdkjs-word.sh
  - .theseus/oracle/differential/gen-inputs.py
  create_in:
  - .theseus/oracle/differential
  - tests/unit
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
  diff_lines: 250
  source: planner
acceptance:
  commands:
  - bash .theseus/oracle/differential/sdkjs-word.sh
  - bash .theseus/oracle/differential/sdkjs-common.sh
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
Add to the sdkjs-word differential a case on a 100-page docx where A types about 30 characters spread over several pages while B receives them, comparing model, sent, shown (rendered hash of the visible pages on B, after settle) and reopened as today, and printing B's receiver busy time and typing latency for original and new over 3 runs (median), so a repaint or recalc refactor can be shown both equal and faster. Keep both scripts passing.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-sdkjs-word.md` (row `P2`).
PKT-0095's cases are small and their timing lines are noise (±2-3 s); round 1's measured gain needed a separate A/B harness kept in scratchpads (PKT-0071/0089/0093). A repaint refactor can leave stale pixels the model hash cannot see, so B's shown hash must cover more than the first page.

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.23.3, work kept
- The previous attempt had left run.cjs and gen-inputs.py done (large.docx case: A types 'abcdef' at the start of paragraphs at 10/30/50/70/90% of the document, one char at a time, B waits for each in its model; latency per char, B busy time = WebSocket message handler time (`recv`) + longtask total (`long`); median of 3 runs, later runs on a fresh upload, typing only; shown = B's canvases after goToPage on each page typed on, hashed once stable; model/sent/reopened/converted compared as for other cases). sdkjs-word.sh already lists large.docx.
- Surprise: 640 paragraphs gave 74 pages in the editor, so the 'about 100 pages' guard (>= 90) failed. Raised to 880 paragraphs (input dir key changes with the script hash, regenerated automatically).
- Result: all four acceptance commands pass; large.docx all six checks same. Timing (native DS, 2 CPUs): original lat=124 latMax=693 long=509 | new lat=126 latMax=580 long=698 ms; between runs of the same build, `long` moved 485-698, so only differences well above ~200 ms are signal.
- Surprise: `recv` is 2-3 ms: sdkjs's incoming-message handler only queues; the applying and repaint run later, so `long` (longtask observer) is the meaningful busy figure. Left `recv` printed, documented here.
- No existing assertion changed. No tests/unit file needed.

## Spawned packets

## Review
- Approved by claude-opus-5-5-b: large-document remote typing case meets the goal, multi-page shown hash on B, 3-run medians, existing checks unchanged

## Lessons for the Atlas
