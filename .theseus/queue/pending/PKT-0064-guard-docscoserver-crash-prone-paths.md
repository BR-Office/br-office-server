---
id: PKT-0064
title: Guard DocsCoServer crash-prone paths
type: refactor
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:P4
depends_on:
- PKT-0028
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
  - Existing tests keep passing unchanged
  forbidden: []
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
Add the missing null/undefined guards and error handling found by P2 and fix the editorStat fallback at DocsCoServer.js:155 (new editorDataStorage() used for editorStat), with tests.

## Essential context
- Wave 1 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P4`).
Crash fixes upstream are almost all such guards in DocsCoServer.js, canvasservice.js and converter.js (baseline PKT-0017).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
