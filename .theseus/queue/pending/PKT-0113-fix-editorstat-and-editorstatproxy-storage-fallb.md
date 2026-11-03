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
  executor: null
  reviewer: null
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

## Lessons for the Atlas
