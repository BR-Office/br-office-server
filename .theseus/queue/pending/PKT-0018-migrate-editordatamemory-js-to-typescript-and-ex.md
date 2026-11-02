---
id: PKT-0018
title: "Migrate editorDataMemory.js to TypeScript and extract the EditorData interface"
type: migrate
priority: medium
module: docservice

origin:
  type: diagnosis
  ref: DIAG-docservice

depends_on: [PKT-0009, PKT-0013]

target:
  files:
    - "DocService/sources/editorDataMemory.js"
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
    - "DocService/package.json pkg.scripts keeps listing ./sources/editorDataMemory.js (the emitted file exists at build time because build:ts runs before pkg)"
  forbidden: ["DocService/package.json"]

acceptance:
  commands:
    - "npx tsc -p tsconfig.json --noEmit"
    - ".theseus/oracle/unit.sh"
    - "npm run lint:check"

budget:
  max_files_changed: 6
  max_diff_lines: 1400
  max_cost_usd: 6.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
---

## Goal
Migrate `DocService/sources/editorDataMemory.js` to TypeScript and extract the `EditorData`/`EditorStat` interfaces other backends (Redis, outside this repository) must meet.

## Essential context
- Wave 1 of DIAG-docservice (P6). Characterized by PKT-0013 (`tests/unit/editorDataMemory.tests.js`).
- Follow `.theseus/adapter/interop-javascript-typescript.md`, section "Decisions (PKT-0009)", and use `DocService/sources/utilsDocService.ts` as the house style (first migrated leaf).
- `git mv` the `.js` to `.ts`; the `.js` becomes a build output of `ts-strip.js` (it finds every `.ts` under `Common/sources` and `DocService/sources` by itself). Add **one explicit line** for the emitted `.js` to `.gitignore` and to `.prettierignore`, next to the `utilsDocService.js` line, and make sure the old `.js` is no longer tracked.
- `tsconfig.json` has `strict` and `erasableSyntaxOnly`: no `enum`, no `namespace`, no constructor parameter properties, no `import x = require()` (Node strips types, it does not transform). Use `as const` objects and type aliases instead.
- Keep CommonJS (`require`/`module.exports`). Types strict inside, `unknown` at external input.
- Record anything surprising in the executor log of this packet.
- Put the interfaces in a type-only file created in `DocService/sources/` (for example `editorData.types.ts`, exporting types only); `ts-strip.js` will emit an empty module for it, which is harmless. The classes implement them.
- Types are erased at runtime: the extracted interfaces document the contract, they do not enforce it on JavaScript callers.

## Suggested plan
1. Write the interfaces from the class's public methods.
2. `git mv` the class to `.ts`, implement the interfaces, ignore lines.
3. Run the acceptance commands; log surprises.

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
