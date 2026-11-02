---
id: PKT-0046
title: Run the sdkjs common QUnit suites as the module oracle
type: characterize
priority: medium
module: sdkjs-common
origin:
  type: plan
  ref: plan:sdkjs-common:dcb03039:P2
depends_on: []
target:
  files:
  - .theseus/atlas/sdkjs-common.md
  create_in:
  - .theseus/oracle
context:
  cards:
  - sdkjs-common
  references:
  - .theseus/diagnosis/DIAG-sdkjs-common.md
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
Run external/sdkjs/tests/common suites headless (npm ci in build, npm run develop, node-qunit-puppeteer as in external/sdkjs/AGENTS.md), record pass/fail, duration and skipped suites, write a wrapper script under .theseus/oracle, and set the card's oracle level and sources. Note what is not covered (font loading, co-edit apply) so refactors there add their own checks.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-sdkjs-common.md` (row `P2`).
The card says oracle none; tests/common has api, charts and color-mods suites run by tests/runAll.js upstream. Wave-1 refactors are gated on this.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
