---
id: PKT-0009
title: Characterize DocService HTTP command and convert endpoints
type: characterize
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:P1
depends_on: []
target:
  files: []
  create_in:
  - tests/unit/docservice
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
Pin the current responses of /coauthoring/CommandService.ashx, /command, /ConvertService.ashx, /converter and /healthcheck (status codes, error codes, JWT and checkClientIp rejection) with jest tests that mock the Common queue, storage and database layers.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P1`).
Routes are registered in DocService/sources/server.js; handlers live in DocsCoServer.js (commandFromServer, healthCheck) and converterservice.js (convertXml, convertJson). Jest config is tests/jest.config.js.

## Suggested plan

## Executor log
- discard: superseded: its plan answered other goals

## Spawned packets

## Review

## Lessons for the Atlas
