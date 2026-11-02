---
id: PKT-0011
title: Characterize wopiClient request building and lock flow
type: characterize
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:P3
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
Pin the headers, proof keys, URLs and error handling of wopiClient lock, unlock, putFile and checkFileInfo with a mocked HTTP layer.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P3`).
DocService/sources/wopiClient.js and wopiUtils.js; discovery is served at /hosting/discovery.

## Suggested plan

## Executor log
- discard: superseded: its plan answered other goals

## Spawned packets

## Review

## Lessons for the Atlas
