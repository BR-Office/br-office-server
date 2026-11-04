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
  reviewer: null
---

## Goal
Make editorStat fall back to the legacy constructor of its own module (editorStatStorage) instead of editorDataStorage, give editorStatProxy the same fallback, and test the three instances, re-applying the design PKT-0064 wrote (createStorageInstance helper) on current main.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P1`).
DocsCoServer.js:155 still uses new editorDataStorage() for editorStat; PKT-0064 implemented the fix with tests/unit/docsCoServerGuards.tests.js but was blocked and never merged. Do not change tests/unit/docsCoServerCrashPaths.tests.js.

## Suggested plan

## Executor log
- Re-applied PKT-0064's commit 8e5cf9e DocsCoServer.js diff verbatim (`git apply` was clean on current main): new `createStorageInstance(module, className, ...args)` helper, used for editorData, editorStat and editorStatProxy; exported for tests. editorStat's legacy fallback now uses editorStatStorage, editorStatProxy gains the same fallback (it previously crashed with "is not a constructor" on a legacy module), and a module with neither export throws a clear TypeError.
- Created tests/unit/docsCoServerGuards.tests.js (PKT-0064's file) plus two editorStatProxy tests: null without REDIS_SERVER_DB_KEYS_NUM, and an EditorStat instance when it is set (loaded with `jest.isolateModules`, env restored in `finally`). All three instances are now covered.
- docsCoServerCrashPaths.tests.js untouched; no existing assertion changed.
- Acceptance: unit.sh 13 suites / 185 passed, 1 skipped; lint:check 0 errors (1 pre-existing warning in AdminPanel, outside target).
- Surprise: none; the blocked packet's code still applied cleanly, so recovering work from blocked branches via `git show <sha>` was cheap.

## Spawned packets

## Review

## Lessons for the Atlas
- DocsCoServer storages are built via `createStorageInstance`; module-level instances depending on env vars (editorStatProxy) are testable with `jest.isolateModules` after setting the env var.
