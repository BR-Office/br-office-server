---
id: PKT-0040
title: "Make npm run lint:check pass: ignore or fix .theseus/oracle/perf scripts"
type: refactor
priority: medium
module: tooling

origin:
  type: packet
  ref: PKT-0027

depends_on: []

target:
  files:
    - eslint.config.js
  create_in: []

context:
  cards: []
  references: []

contract:
  preserve:
    - "Lint rules for product code (DocService, Common, FileConverter, AdminPanel, tests) are unchanged"
  forbidden: []

acceptance:
  commands:
    - npm run lint:check
    - .theseus/oracle/unit.sh

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Make npm run lint:check pass: ignore or fix .theseus/oracle/perf scripts.

## Essential context
- Found by PKT-0027 (2026-11-02): `npm run lint:check` (`eslint .`) fails with 55 errors, all in the
  measurement scripts `.theseus/oracle/perf/*.js` (client-breakdown, client-perf, coedit-split, convert-large,
  e2e-coedit, e2e-convert, load-coedit), committed by the perf packets (PKT-0013..0026). They are
  browser/puppeteer scripts (`window`, `editor` undefined; unused catch vars; empty blocks).
- Every packet whose acceptance includes `npm run lint:check` is blocked until this is fixed.
- Suggested fix: add `.theseus/**` to the `ignores` of `eslint.config.js` (method tooling, not product code),
  or give those files browser globals. Related: PKT-0035 (ignore `external/`).

## Suggested plan

## Executor log
- Surprise: the fix was already on the branch. Commit f500ee1 (PKT-0049) added `.theseus/**` (and `external/**`) to the `ignores` of `eslint.config.js`.
- Decision: no code change. `eslint.config.js` is left as it is, and the product lint rules are unchanged (contract kept).
- Proof: `npm run lint:check` gives 0 errors (1 existing react-hooks warning in AdminPanel). `.theseus/oracle/unit.sh` gives 178 passed, 1 skipped.
- Not done: nothing. This packet duplicates PKT-0049 and can be closed as already satisfied.

## Spawned packets

## Review

## Lessons for the Atlas
- `.theseus/**` is ignored by eslint (PKT-0049). Method scripts are not product lint scope.
