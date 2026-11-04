---
id: PKT-0114
title: Port upstream fix 81132 for client abort during file streaming
type: refactor
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:r2:P2
depends_on: []
target:
  files:
  - DocService/sources/routes/static.js
  - DocService/sources/ai/aiProxyHandler.js
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
  files: 3
  diff_lines: 160
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
  executor: claude-opus-5-5-b
  reviewer: null
---

## Goal
Apply the logic hunks of ONLYOFFICE commit 12ba395e (.theseus/diagnosis/PKT-0029-upstream-81132.patch) so an aborted client during streaming no longer sends a status after headers are sent, with a unit test that aborts a stream mid-way.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P2`).
PKT-0029 checked the logic hunks apply with git apply --check -C1; static.js:141 still calls res.sendStatus(400) without a headersSent check. Recommended low risk.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
