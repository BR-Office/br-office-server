---
id: PKT-0049
title: 'Repair the main branch: the integration check fails'
type: refactor
priority: critical
module: project
origin:
  type: plan
  ref: repair:5979c5a
depends_on: []
target:
  files: []
  create_in:
  - '**'
context:
  cards: []
  references: []
contract:
  preserve:
  - 'No change of behavior: only what makes the check pass again'
  - Existing tests keep passing
  forbidden: []
acceptance:
  commands:
  - .theseus/oracle/unit.sh && npm run lint:check
budget:
  max_files_changed: 10
  max_diff_lines: 1500
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
The main branch no longer passes `factory.integrate_check` (`.theseus/oracle/unit.sh && npm run lint:check`): acceptance failed: `.theseus/oracle/unit.sh && npm run lint:check`. Make it pass again with the smallest change, without changing behavior, and say in the Executor log which earlier packet introduced the failure.

## Essential context
- Planned by `theseus plan`: the check failed on the main branch at 5979c5a.
- The target is open (`create_in: ["**"]`) because the cause is not known in advance; change only what the failure needs.
- Failure excerpt:
```
  ● Console
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
  ● Console
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
          at Sharp._createInputDescriptor (/home/claude/euro-office-server/DocService/node_modules/sharp/lib/input.js:51:13)
          at new Sharp (/home/claude/euro-office-server/DocService/node_modules/sharp/lib/constructor.js:351:29)
          at Sharp (/home/claude/euro-office-server/DocService/node_modules/sharp/lib/constructor.js:173:12)
          at Object.sharp [as processImageOptimal] (/home/claude/euro-office-server/DocService/sources/utilsDocService.js:163:24)
  ● Console
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
      [2026-11-02T19:35:31.144] [INFO] [null] [null] [null] nodeJS - Received request for: /
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
PASS ../tests/unit/watchWithFallback.tests.js
PASS ../tests/unit/operationContext.tests.js
PASS ../tests/unit/runtimeConfigManager.tests.js
  ● Console
      [2026-11-02T19:35:31.645] [INFO] [localhost] [docId] [userId] nodeJS - handleConfigFileChange reloading config: runtime.json
      at ../Common/node_modules/log4js/lib/appenders/console.js:6:5
PASS ../tests/unit/sentryReporter.tests.js
PASS ../tests/unit/sample.tests.js
Test Suites: 10 passed, 10 total
Tests:       1 skipped, 133 passed, 134 total
Snapshots:   0 total
Time:        3.747 s, estimated 4 s
Ran all test suites matching /unit/i.
Force exiting Jest: Have you considered using `--detectOpenHandles` to detect async operations that kept running after all tests finished?
> builder@1.0.1 lint:check
   20:13  error  'window' is not defined                 no-undef
   21:3   error  'window' is not defined                 no-undef
   24:65  error  'window' is not defined                 no-undef
   26:77  error  'window' is not defined                 no-undef
   38:53  error  'window' is not defined                 no-undef
   38:71  error  'window' is not defined                 no-undef
   38:85  error  'Asc' is not defined                    no-undef
   91:38  error  'editor' is not defined                 no-undef
   96:35  error  'editor' is not defined                 no-undef
   97:46  error  'requestAnimationFrame' is not defined  no-undef
  103:31  error  'window' is not defined                 no-undef
  103:85  error  'window' is not defined                 no-undef
  108:35  error  'editor' is not defined                 no-undef
  111:42  error  'window' is not defined                 no-undef
  112:42  error  'window' is not defined                 no-undef
/home/claude/euro-office-server/.theseus/oracle/perf/client-perf.js
  17:44  error  'window' is not defined                 no-undef
  17:61  error  'editor' is not defined                 no-undef
  17:94  error  'editor' is not defined                 no-undef
  24:39  error  'editor' is not defined                 no-undef
  24:85  error  'editor' is not defined                 no-undef
  49:37  error  'editor' is not defined                 no-undef
  50:48  error  'requestAnimationFrame' is not defined  no-undef
  58:37  error  'editor' is not defined                 no-undef
/home/claude/euro-office-server/.theseus/oracle/perf/coedit-split.js
  22:13  error  'window' is not defined                                                       no-undef
  23:3   error  'window' is not defined                                                       no-undef
  26:67  error  'window' is not defined                                                       no-undef
  28:79  error  'window' is not defined                                                       no-undef
  37:40  error  'window' is not defined                                                       no-undef
  37:57  error  'editor' is not defined                                                       no-undef
  37:90  error  'editor' is not defined                                                       no-undef
  42:50  error  'editor' is not defined                                                       no-undef
  43:49  error  'window' is not defined                                                       no-undef
  43:68  error  'window' is not defined                                                       no-undef
```

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
