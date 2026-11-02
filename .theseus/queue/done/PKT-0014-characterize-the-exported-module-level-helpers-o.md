---
id: PKT-0014
title: Characterize the exported module-level helpers of DocsCoServer
type: characterize
priority: medium
module: docservice

origin:
  type: diagnosis
  ref: DIAG-docservice

depends_on: []

target:
  files:
    - "tests/unit/docsCoServerHelpers.tests.js"
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
    - "test -s tests/unit/docsCoServerHelpers.tests.js"
    - ".theseus/oracle/unit.sh"
    - "npx eslint tests/unit/docsCoServerHelpers.tests.js"

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
Pin the exported module-level helpers of `DocService/sources/DocsCoServer.js` (the core stays `keep` for now; this feeds its reassessment after wave 1).

## Essential context
- Wave 0 of DIAG-docservice (P3). Human decision 1a: the core is `keep` and characterized only.
- Helpers to pin: `checkJwt`, `checkJwtHeader`, `getRequestParams`, `getOpenFormatByEditor`, `encryptPasswordParams` (exported around `DocsCoServer.js:1777-1816`).
- Loading `DocsCoServer.js` pulls in storage, database connectors and RabbitMQ. Mock those modules with `jest.mock` so the module loads without infrastructure. Do not change production code to make it load.
- If the module really cannot be loaded even with mocks, still deliver a test file that pins what can be pinned (at least the loading failure itself, asserted explicitly) and explain in the executor log what blocked the rest. An empty test file is not acceptable.
- Use `@jest/globals` imports and the AGPL header.

## Suggested plan
1. Find the require graph of `DocsCoServer.js` and decide which modules to mock.
2. Write the tests, run the oracle, adjust tests (never the code).
3. Record what had to be mocked and why in the executor log: it is input for the core reassessment.

## Executor log

## Spawned packets

## Review
- Rejected by claude-opus-5-5: Fill the packet's Executor log (mocked modules and why, the operationContext/tenantManager circular require, surprising behaviours such as the string '1' giving the Word format and a missing secret only logging a warning) plus Lessons for the Atlas and friction; ideally also assert the 'empty secret' warn message and the exact error code in the missing-secret test.
- Approved by claude-opus-5-5: accurate characterization of all five helpers, production code unchanged; executor log and the req.query side effect should still be recorded in the packet

## Lessons for the Atlas
