---
id: PKT-0027
title: Characterize ConvertService sync and async flow in converterservice.js
type: characterize
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:P1
depends_on: []
target:
  files: []
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
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Pin the behaviour of convertJson/convertXml in sync (async=false) and async mode, including the polling loop, timeout (CONVERT_TIMEOUT) and error statuses, with taskResult and the queue mocked.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P1`).
The loop is at DocService/sources/converterservice.js:156-170 with CONVERT_ASYNC_DELAY=1000 (line 49). Baseline PKT-0015 shows sync answers in whole seconds.

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: mkdir -p x; head -24 tests/unit/utilsDocService.tests.js > tests/unit/converterService.tests.js; cat >> tests/unit/conve…; Bash: cd tests/unit && python3 - <<'PY'; Bash: npm run lint:check 2>&1 | tail -15; npx prettier --check tests/unit/converterService.tests.js 2>&1 | tail -3; Bash: npx eslint tests/unit/converterService.tests.js && npx prettier --check tests/unit/converterService.tests.js && echo OK; Bash: sed -n 26,40p eslint.config.js; ls external; git check-ignore -v external; git ls-files external | head -3; Bash: node -e "const {ESLint}=require('eslint');new ESLint().lintFiles(['tests/unit/converterService.tests.js']).then(r=>{cons…; Bash: cd .theseus/spawn && python3 -c "
- attempt 1: acceptance failed: `npm run lint:check`
- attempt 2: the executor's permissions refused: Bash: .theseus/oracle/unit.sh 2>&1 | tail -5; npm run lint:check > ../lint.log 2>&1; echo exit=$?; tail -3 ../lint.log; Bash: sed -i '38s/.*/{"packet":"PKT-0027","role":"executor","model":"claude-opus-5-5","date":"2026-11-02","hindered":{"ref":"w…
- attempt 2: acceptance failed: `npm run lint:check`

## Spawned packets

## Review

## Lessons for the Atlas
