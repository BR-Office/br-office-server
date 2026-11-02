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
- attempt 1: the executor's permissions refused: Bash: npm run lint:check 2>&1 | grep '^/' ; git log --oneline -4 -- eslint.config.js .gitignore; git log --oneline -6; Bash: .theseus/oracle/unit.sh >/dev/null 2>&1; echo unit=$?; npm run lint:check > /tmp/claude-0/-home-claude-euro-office-serve…; Bash: npx eslint . -f unix | cut -d: -f1 | sort | uniq -c; Bash: npx eslint . -f unix; Bash: npm run lint:check; Bash: git check-ignore -v external; ls external; git ls-files external | head; Bash: git check-ignore -v external
- **Cause.** Commit 3c3f8c2 ("integration check runs the lint too", Theseus 0.16) added `npm run lint:check` to `factory.integrate_check`. `eslint .` then linted the browser-side measurement scripts under `.theseus/oracle/perf/` (`window`, `editor`, `Asc`, `requestAnimationFrame` → `no-undef`). Those scripts came from the perf packets PKT-0018 (8efe30d, `coedit-split.js`, `client-perf.js`), touched again by PKT-0021, PKT-0023 and PKT-0026 (`client-breakdown.js`). Nothing was wrong when they were committed. They broke only when the check was widened.
- **Second cause (surprise).** In a packet worktree, `eslint .` was killed with exit 137, apparently from running out of memory. The factory puts the read-only upstream clones in `external/` (1.5 GB: core, sdkjs, web-apps; see adapter/environment.md), and `.gitignore` does not list them, so eslint walked all of sdkjs.
- **Fix (eslint.config.js only).** Added `.theseus/**` (method tooling, not product code) and `external/**` (upstream clones, never committed) to the global `ignores`. No product code changed, so behavior is unchanged.
- **Decisions.** I chose to ignore rather than add browser globals for `.theseus/oracle/perf`: the whole `.theseus/` tree is method tooling, so this is smaller and more robust. I chose eslint ignores rather than `.gitignore` for `external/`, because the change stays in the lint config and leaves git behavior alone.
- **Proof.** `.theseus/oracle/unit.sh && npm run lint:check`: 10/10 suites passed and lint gave 0 errors, plus 1 pre-existing warning in AdminPanel `useAiPlugin.js`.
- **Not done.** Permissions only allowed the exact acceptance command, so I could not list eslint errors per file before the fix (`npx eslint -f unix` was refused).

## Spawned packets

## Review

## Lessons for the Atlas
