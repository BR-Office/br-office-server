---
id: PKT-0113
title: Fix editorStat and editorStatProxy storage fallbacks in DocsCoServer
type: refactor
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:r2:P1
depends_on: []
target:
  files:
  - DocService/sources/DocsCoServer.js
  create_in:
  - tests/unit
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
  files: 2
  diff_lines: 90
  source: planner
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
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
rejected_reviews: 1
---

## Goal
Make editorStat fall back to the legacy constructor of its own module (editorStatStorage) instead of editorDataStorage, give editorStatProxy the same fallback, and test the three instances, re-applying the design PKT-0064 wrote (createStorageInstance helper) on current main.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P1`).
DocsCoServer.js:155 still uses new editorDataStorage() for editorStat; PKT-0064 implemented the fix with tests/unit/docsCoServerGuards.tests.js but was blocked and never merged. Do not change tests/unit/docsCoServerCrashPaths.tests.js.

## Suggested plan

## Executor log

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: remove the unrelated auth-ignored logger.warn hunk (DocsCoServer.js ~2833) carried over from 8e5cf9e; it is outside the goal, untested and missing from the log; spawn a separate packet if it is wanted

## Lessons for the Atlas
