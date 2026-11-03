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
  executor: null
  reviewer: null
---

## Goal
Add to the sdkjs-word differential a case on a 100-page docx where A types about 30 characters spread over several pages while B receives them, comparing model, sent, shown (rendered hash of the visible pages on B, after settle) and reopened as today, and printing B's receiver busy time and typing latency for original and new over 3 runs (median), so a repaint or recalc refactor can be shown both equal and faster. Keep both scripts passing.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-sdkjs-word.md` (row `P2`).
PKT-0095's cases are small and their timing lines are noise (±2-3 s); round 1's measured gain needed a separate A/B harness kept in scratchpads (PKT-0071/0089/0093). A repaint refactor can leave stale pixels the model hash cannot see, so B's shown hash must cover more than the first page.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
