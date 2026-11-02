---
id: PKT-0017
title: "Migrate wopiUtils.js to TypeScript"
type: migrate
priority: high
module: docservice

origin:
  type: diagnosis
  ref: DIAG-docservice

depends_on: [PKT-0009, PKT-0012]

target:
  files:
    - "DocService/sources/wopiUtils.js"
    - ".gitignore"
    - ".prettierignore"
  create_in: ["DocService/sources"]

context:
  cards: [docservice]
  references: [.theseus/adapter/interop-javascript-typescript.md]

contract:
  preserve:
    - "The module.exports shape is identical: same names, same values, same behavior"
    - "Every existing unit test passes without changes to what it asserts"
    - "Every require of the module keeps resolving with no edit to its callers"
    - "The Makefile and the DocService pkg/bin entries are untouched and keep resolving to JavaScript"
    - "WOPI headers, URL precedence and the proof buffer layout stay byte-identical (pinned by tests/unit/wopiUtils.tests.js)"
  forbidden: []

acceptance:
  commands:
    - "npx tsc -p tsconfig.json --noEmit"
    - ".theseus/oracle/unit.sh"
    - "npm run lint:check"

budget:
  max_files_changed: 5
  max_diff_lines: 700
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
---

## Goal
Migrate `DocService/sources/wopiUtils.js` to `wopiUtils.ts`.

## Essential context
- Wave 1 of DIAG-docservice (P5). Characterized by PKT-0012; its commit message lists surprises (BigInt timestamp breaks `%j` debug logging, proof headers need both keys, undefined token handling). Keep them as they are: a migration changes no behavior.
- Follow `.theseus/adapter/interop-javascript-typescript.md`, section "Decisions (PKT-0009)", and use `DocService/sources/utilsDocService.ts` as the house style (first migrated leaf).
- `git mv` the `.js` to `.ts`; the `.js` becomes a build output of `ts-strip.js` (it finds every `.ts` under `Common/sources` and `DocService/sources` by itself). Add **one explicit line** for the emitted `.js` to `.gitignore` and to `.prettierignore`, next to the `utilsDocService.js` line, and make sure the old `.js` is no longer tracked.
- `tsconfig.json` has `strict` and `erasableSyntaxOnly`: no `enum`, no `namespace`, no constructor parameter properties, no `import x = require()` (Node strips types, it does not transform). Use `as const` objects and type aliases instead.
- Keep CommonJS (`require`/`module.exports`). Types strict inside, `unknown` at external input.
- Record anything surprising in the executor log of this packet.
- `unknown` at the `ctx`/`fileInfo` boundary, narrowed inside.

## Suggested plan
1. `git mv`, add types, ignore lines.
2. Run the acceptance commands.
3. Log surprises.

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
