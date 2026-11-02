---
id: PKT-0010
title: "Characterize commondefines: constants, command classes and JSON round trips"
type: characterize
priority: high
module: common

origin:
  type: diagnosis
  ref: DIAG-common

depends_on: []

target:
  files:
    - "tests/unit/commondefines.tests.js"
  create_in: [tests/unit]

context:
  cards: [common]
  references: []

contract:
  preserve:
    - "Production code is not changed: only tests are added"
    - "Existing tests keep passing unchanged"
    - "Tests assert what the code does today; surprising behavior is recorded in the packet, not fixed"
  forbidden: []

acceptance:
  commands:
    - ".theseus/oracle/unit.sh"
    - "npx eslint tests/unit/commondefines.tests.js"

budget:
  max_files_changed: 2
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Pin the behavior of `Common/sources/commondefines.js` and the protocol values of `Common/sources/constants.js` before they are migrated to TypeScript (wave 1).

## Essential context
- Wave 0 of DIAG-common (plan #1) and DIAG-common-b. Both diagnoses agree: characterize before migrating.
- Pin the `constants` values that are protocol (error codes and other numeric values clients or other services see). Use a table-driven test over the exported names rather than one assertion per line.
- Pin `InputCommand`, `TaskQueueData`, `OutputSfcData` (and the other command/data classes exported by `commondefines.js`): construction from a plain object, getters/setters, and `JSON.stringify` round trips, including the security-related fields that are forced to `undefined` (around `commondefines.js:33-37`) and `copyExplicit`.
- `commondefines.js` holds `buildVersion`/`buildNumber`, which the `Makefile` patches with `sed` at build time. Do not assert their literal values; assert only that they are strings.
- Tests use `@jest/globals` imports and the file layout of `tests/unit/utils.tests.js` (see `.theseus/adapter/conventions.md`). The test file needs the AGPL header used by the other test files.

## Suggested plan
1. Read `commondefines.js` and `constants.js` and list the exports.
2. Write the tests, run `.theseus/oracle/unit.sh`, fix the tests (never the code) until they pass.
3. Record any surprising behavior in the executor log.

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
