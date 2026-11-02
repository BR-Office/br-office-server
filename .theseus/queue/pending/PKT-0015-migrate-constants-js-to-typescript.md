---
id: PKT-0015
title: "Migrate constants.js to TypeScript"
type: migrate
priority: high
module: common

origin:
  type: diagnosis
  ref: DIAG-common

depends_on: [PKT-0009, PKT-0010]

target:
  files:
    - "Common/sources/constants.js"
    - ".gitignore"
    - ".prettierignore"
  create_in: ["Common/sources"]

context:
  cards: [common]
  references: [.theseus/adapter/interop-javascript-typescript.md]

contract:
  preserve:
    - "The module.exports shape is identical: same names, same values, same behavior"
    - "Every existing unit test passes without changes to what it asserts"
    - "Every require of the module keeps resolving with no edit to its callers"
    - "The Makefile and the DocService pkg/bin entries are untouched and keep resolving to JavaScript"
    - "Error codes and other protocol values keep their exact numeric/string values (pinned by tests/unit/commondefines.tests.js)"
  forbidden: ["Common/sources/commondefines.js", "Common/sources/license.js"]

acceptance:
  commands:
    - "npx tsc -p tsconfig.json --noEmit"
    - ".theseus/oracle/unit.sh"
    - "npm run lint:check"

budget:
  max_files_changed: 5
  max_diff_lines: 900
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
---

## Goal
Migrate `Common/sources/constants.js` to `constants.ts`: the first migrated leaf of Common.

## Essential context
- Wave 1 of DIAG-common (#5). Characterized by PKT-0010.
- Follow `.theseus/adapter/interop-javascript-typescript.md`, section "Decisions (PKT-0009)", and use `DocService/sources/utilsDocService.ts` as the house style (first migrated leaf).
- `git mv` the `.js` to `.ts`; the `.js` becomes a build output of `ts-strip.js` (it finds every `.ts` under `Common/sources` and `DocService/sources` by itself). Add **one explicit line** for the emitted `.js` to `.gitignore` and to `.prettierignore`, next to the `utilsDocService.js` line, and make sure the old `.js` is no longer tracked.
- `tsconfig.json` has `strict` and `erasableSyntaxOnly`: no `enum`, no `namespace`, no constructor parameter properties, no `import x = require()` (Node strips types, it does not transform). Use `as const` objects and type aliases instead.
- Keep CommonJS (`require`/`module.exports`). Types strict inside, `unknown` at external input.
- Record anything surprising in the executor log of this packet.
- Many modules read these constants: the exported names and values are a protocol. Prefer `as const` so values stay literal types.

## Suggested plan
1. `git mv` to `.ts`, add types (`as const`), ignore lines.
2. Run the three acceptance commands.
3. Log surprises.

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
