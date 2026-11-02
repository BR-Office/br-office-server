---
id: PKT-0019
title: "Lint TypeScript sources with typescript-eslint"
type: interop
priority: medium
module: docservice

origin:
  type: diagnosis
  ref: DIAG-docservice

depends_on: [PKT-0009]

target:
  files:
    - "package.json"
    - "npm-shrinkwrap.json"
    - "eslint.config.js"
    - ".theseus/adapter/interop-javascript-typescript.md"
  create_in: []

context:
  cards: [docservice, common]
  references: [.theseus/adapter/interop-javascript-typescript.md]

contract:
  preserve:
    - "npm run lint:check keeps passing on the JavaScript sources with the same rules"
    - "No source file changes: only lint configuration and dev dependencies"
  forbidden: []

allowed_commands:
  - "npm install"
  - "npm ci"

acceptance:
  commands:
    - "npx tsc -p tsconfig.json --noEmit"
    - ".theseus/oracle/unit.sh"
    - "npm run lint:check"

budget:
  max_files_changed: 5
  max_diff_lines: 3000
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
---

## Goal
Lint the TypeScript sources (`*.ts` under `Common/sources` and `DocService/sources`) with `typescript-eslint`. PKT-0009 was asked to spawn this packet and did not.

## Essential context
- TypeScript 7 has no programmatic API until 7.1: `typescript-eslint` must load TypeScript 6 through the npm alias `@typescript/typescript6` (see the interop doc). The compiler used by `tsc` stays 7.
- PKT-0009 currently excludes `*.ts` from ESLint. Replace that exclusion with a `typescript-eslint` block for `**/*.ts` (type-aware rules are optional; the recommended non-type-checked set is enough to start).
- Install with `npm install --save-dev` so `package.json` and `npm-shrinkwrap.json` stay consistent; never hand-edit the shrinkwrap.
- `utilsDocService.ts` must pass the new rules; if a rule fires, adjust the rule set in the config rather than the source (source files are outside this target) and record it.
- Record in the interop doc how `.ts` linting works and when to drop the alias (TypeScript 7.1).

## Suggested plan
1. Install `typescript-eslint` and the `@typescript/typescript6` alias.
2. Add the `.ts` block to `eslint.config.js`.
3. Run the acceptance commands; update the interop doc.

## Executor log
- discard: created by hand to cover a spawn PKT-0009 missed; Rafael: follow-ups must come from the product, not manual remediation

## Spawned packets

## Review

## Lessons for the Atlas
