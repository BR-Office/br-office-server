---
id: PKT-0007
title: Characterize Common operationContext
type: characterize
priority: medium
module: common
origin:
  type: plan
  ref: plan:common:P2
depends_on: []
target:
  files: []
  create_in:
  - tests/unit
context:
  cards:
  - common
  references:
  - .theseus/diagnosis/DIAG-common.md
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
Pin Context.toJSON()/initFromTaskQueueData round-trip (cross-service wire format), initFromRequest and getCfg precedence (tenant over runtime over base).

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-common.md` (row `P2`).
Common/sources/operationContext.js; invariants in .theseus/atlas/common.md.

## Suggested plan

## Executor log
- Created `tests/unit/operationContext.tests.js` (16 tests): toJSON field set and order, no leak of config/secret/license, round-trip via TaskQueueData JSON + initFromTaskQueueData and via initFromPubSub, initFromRequest (tenant from tenantManager, shardkey/WOPISrc/usid from query, docId/userId kept), getCfg precedence tenant > runtime > base, defaultValue, persistentStorage inheritance, per-tenant cache invalidation.
- Decision: isolate the config layers with `jest.spyOn` on the `tenantManager`, `runtimeConfigManager` and `moduleReloader` exports (operationContext calls them through the module object); no file fixtures. `afterEach` restores mocks and clears the module-global config cache.
- Surprise (pinned, not fixed): `init()` does not clear `userSessionId` when the new value is falsy, so a reused Context keeps the previous session id. `initFromRequest` resets shardKey/wopiSrc to undefined when the query lacks them.
- Acceptance: unit.sh 10 suites, 133 passed, 1 skipped; lint:check 0 errors (1 pre-existing AdminPanel warning).
- Not done: initFromConnection / initFromConnectionRequest not covered (outside the Goal). Friction line appended to `.theseus/scoreboard/friction.jsonl` as AGENTS.md requires.

## Spawned packets

## Review

## Lessons for the Atlas
- `operationContext` now has unit tests; the common card line "No unit tests seen for ... operationContext" is outdated.
- `Context.init` keeps a stale `userSessionId` when called with a falsy one.
- Config layers can be isolated in unit tests by spying on module exports; the per-tenant cache must be cleared between tests.
