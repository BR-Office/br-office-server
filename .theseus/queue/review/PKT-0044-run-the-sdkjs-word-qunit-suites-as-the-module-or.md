---
id: PKT-0044
title: Run the sdkjs word QUnit suites as the module oracle
type: characterize
priority: medium
module: sdkjs-word
origin:
  type: plan
  ref: plan:sdkjs-word:dcb03039:P2
depends_on: []
target:
  files:
  - .theseus/atlas/sdkjs-word.md
  create_in:
  - .theseus/oracle
context:
  cards:
  - sdkjs-word
  references:
  - .theseus/diagnosis/DIAG-sdkjs-word.md
contract:
  preserve:
  - Existing tests keep passing unchanged
  forbidden: []
allowed_commands:
- '*'
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
Run the external/sdkjs/tests/word suites headless (npm ci in build, npm run develop, node-qunit-puppeteer as in external/sdkjs/AGENTS.md), record pass/fail, duration and skipped suites, write a wrapper script under .theseus/oracle, and set the card's oracle level and sources.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-sdkjs-word.md` (row `P2`).
The card says oracle none, but 21 word suites exist and tests/runAll.js runs them in upstream CI. Refactors in wave 1 are gated on this.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
