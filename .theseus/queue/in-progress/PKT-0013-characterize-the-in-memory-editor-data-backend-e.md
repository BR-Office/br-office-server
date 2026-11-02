---
id: PKT-0013
title: Characterize the in-memory editor data backend (editorDataMemory)
type: characterize
priority: high
module: docservice

origin:
  type: diagnosis
  ref: DIAG-docservice

depends_on: []

target:
  files:
    - "tests/unit/editorDataMemory.tests.js"
  create_in: [tests/unit]

context:
  cards: [docservice]
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
    - "npx eslint tests/unit/editorDataMemory.tests.js"

budget:
  max_files_changed: 2
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-sonnet-5-5
  reviewer: claude-opus-5-5
rejected_reviews: 1
---

## Goal
Pin the behavior of `DocService/sources/editorDataMemory.js` before it is migrated and its `EditorData`/`EditorStat` interface is extracted (wave 1, P6).

## Essential context
- Wave 0 of DIAG-docservice (P2).
- The module exports `EditorData` and `EditorStat` (check `module.exports` at the end of the file). Cover presence (add, get, remove, counts), locks, messages, force-save state and the `EditorStat` counters.
- The methods are async and take an operation context: use `operationContext.global` or a minimal fake, as other tests do.
- Do not depend on wall-clock timing; if expiry is involved, use Jest fake timers or pass explicit timestamps.
- Use `@jest/globals` imports and the AGPL header.

## Suggested plan
1. List the public methods of both classes.
2. Write behavior tests per method group, run the oracle, adjust tests (never the code).
3. Record surprising behavior in the executor log.

## Executor log
- attempt 2: changed .theseus/queue/in-progress/PKT-0013-characterize-the-in-memory-editor-data-backend-e.md, outside the target (rule R2)

## Spawned packets

## Review
- Rejected by claude-opus-5-5: Record the surprising behaviors (connection-sample pruning compares an object to a number so nothing is ever pruned; lockNotification's NaN token makes it non-re-entrant; getdelSaved returns undefined then null) in the packet's Executor log and Lessons for the Atlas, as contract.preserve requires; the tests themselves are fine.

## Lessons for the Atlas
