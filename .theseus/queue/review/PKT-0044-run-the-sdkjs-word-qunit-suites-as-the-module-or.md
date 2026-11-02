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
- Wrote `.theseus/oracle/sdkjs-word.sh` (setup + run) and `sdkjs-word-run.cjs` (reads the word entries and skip map from upstream `tests/runAll.js`, so the list follows upstream; prints PASS/FAIL, assertions, seconds per suite; exits 1 on any failure; optional substring filter).
- Result (2-CPU VM, concurrency 2): 41/41 suites pass, 6168 assertions, 116–161 s. Skipped: 2 upstream skips (shortcuts, custom-xml-ooxml) + 1 local skip (js-api-forms).
- Decision: js-api-forms fails 0/5 (`AscTest.JsApi.CreateTextForm is not a function`) because the `sdkjs-forms` addon is not under external/. Skipped locally with that reason instead of keeping a red oracle; follow-up requested in .theseus/spawn/.
- Decision: card oracle level `partial`, not `good`: no suite covers Serialize2 open/save on real documents or co-edit change apply.
- Decision: use the preinstalled Playwright Chromium via `PUPPETEER_EXECUTABLE_PATH` (PUPPETEER_SKIP_DOWNLOAD) instead of downloading puppeteer's browser.
- Surprise: external/sdkjs has no package.json, so `npm install node-qunit-puppeteer` there (as upstream AGENTS.md says) installs into the parent server repo's node_modules. The script now creates `external/sdkjs/node_modules` first. My first run left node-qunit-puppeteer + deps in the worktree root `node_modules/` (untracked, --no-save; package.json unchanged); not cleaned to avoid touching the server's installed deps.
- Surprise: the suites load jQuery/QUnit from cdnjs, so the oracle needs network.
- Not done: did not wire sdkjs-word.sh into the acceptance `unit.sh` (not in target; it is the server oracle).

## Spawned packets
- PKT-0056: Check out sdkjs-forms so the word js-api-forms suite runs in the oracle

## Review

## Lessons for the Atlas
