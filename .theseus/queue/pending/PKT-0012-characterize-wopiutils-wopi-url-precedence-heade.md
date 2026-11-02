---
id: PKT-0012
title: "Characterize wopiUtils: WOPI URL precedence, headers and proof"
type: characterize
priority: high
module: docservice

origin:
  type: diagnosis
  ref: DIAG-docservice

depends_on: []

target:
  files:
    - "tests/unit/wopiUtils.tests.js"
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
    - "npx eslint tests/unit/wopiUtils.tests.js"

budget:
  max_files_changed: 2
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
---

## Goal
Pin the behavior of `DocService/sources/wopiUtils.js` before it is migrated (wave 1, P5).

## Essential context
- Wave 0 of DIAG-docservice (P1). Both DocService diagnoses agree the leaves migrate.
- `getWopiFileUrl`: the URL precedence (FileUrl, then TemplateSource, then wopiSrc), with the access token handling.
- `fillStandardHeaders`: the exact header set produced, including the proof headers.
- The proof buffer layout: check it against a fixed RSA key pair generated in the test with `crypto.generateKeyPairSync` (do not commit a key file), verifying the signature with the public key.
- If a function reads `config`, use the values from the test config loaded by `tests/env-setup.js`, or mock as the existing tests do. Use `@jest/globals` imports and the AGPL header.

## Suggested plan
1. Read `wopiUtils.js` and list its exports.
2. Write the tests, run the oracle, adjust tests (never the code).
3. Record surprising behavior (for example, header casing or missing fields) in the executor log.

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
