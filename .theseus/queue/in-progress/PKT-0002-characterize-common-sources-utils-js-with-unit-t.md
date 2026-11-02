---
id: PKT-0002
title: Characterize Common/sources/utils.js with unit tests
type: characterize
priority: high
module: common

origin:
  type: human
  ref: null

depends_on: [PKT-0001]

target:
  files:
    - tests/unit/utils.tests.js
  create_in: []

context:
  cards: [common]
  references:
    - Common/sources/utils.js
    - tests/unit/utils.tests.js
    - tests/jest.config.js

contract:
  preserve:
    - "Production code is not changed: only tests are added"
    - "Existing tests keep passing unchanged"
  forbidden:
    - Common/sources/**
    - DocService/**

acceptance:
  commands:
    - "npm run \"unit tests\""
    - "npx eslint tests/unit/utils.tests.js"

budget:
  max_files_changed: 1
  max_diff_lines: 600
  max_cost_usd: 4.00
  max_attempts: 3

roles:
  executor: claude-sonnet-5-5
  reviewer: null
---

## Goal
Raise the unit test coverage of `Common/sources/utils.js` with characterization tests: tests that record what the functions do today, so later refactor or TypeScript packets can prove they changed nothing.

## Essential context
- The Atlas card `common` (from PKT-0001) lists which `utils.js` functions are not covered yet. Start with pure functions (string, date, URL, crypto helpers) before anything that touches the network or the file system.
- Characterization tests assert current behavior, even when it looks odd. If a behavior looks like a bug, do not fix it: record it under "Executor log" and spawn an `investigate` packet.
- The suite runs from `DocService/` with `--inject-globals=false`: import `describe`, `test` and `expect` from `@jest/globals`, as the existing tests do.

## Suggested plan
1. Read the `common` card and the existing `tests/unit/utils.tests.js`.
2. Pick 8 to 15 uncovered functions, starting with pure ones.
3. Add tests to `tests/unit/utils.tests.js` only.
4. Run the acceptance commands until they pass.

## Executor log
- attempt 1: acceptance failed: `npm run "unit tests"`

## Spawned packets

## Review

## Lessons for the Atlas
