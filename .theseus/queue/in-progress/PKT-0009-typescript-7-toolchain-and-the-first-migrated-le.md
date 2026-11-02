---
id: PKT-0009
title: TypeScript 7 toolchain and the first migrated leaf (utilsDocService)
type: interop
priority: high
module: docservice

origin:
  type: diagnosis
  ref: DIAG-docservice

depends_on: []

target:
  files:
    - "package.json"
    - "npm-shrinkwrap.json"
    - ".gitignore"
    - "eslint.config.js"
    - ".prettierignore"
    - "tests/jest.config.js"
    - ".theseus/oracle/unit.sh"
    - ".theseus/adapter/interop-javascript-typescript.md"
    - ".docker/server.bake.Dockerfile"
    - "DocService/sources/utilsDocService.js"
    - "tests/unit/utilsDocService.tests.js"
  create_in: [., DocService/sources]

context:
  cards: [docservice, common]
  references: []

contract:
  preserve:
    - "Every existing unit test keeps passing; utilsDocService tests pass unchanged in what they assert"
    - "The module.exports shape of utilsDocService stays identical (same names, same behavior)"
    - "Every require('../../Common/sources/x') and require('./x') in the code keeps resolving without edits"
    - "The DocService pkg/bin entries keep resolving to runnable JavaScript"
    - "No other source file is migrated in this packet"
  forbidden: ["Common/sources/commondefines.js", "Common/sources/license.js", "Makefile"]

acceptance:
  commands:
    - "npx tsc -p tsconfig.json --noEmit"
    - ".theseus/oracle/unit.sh"
    - "npm run lint:check"

budget:
  max_files_changed: 14
  max_diff_lines: 1500
  max_cost_usd: 8.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Add the TypeScript 7 toolchain shared by Common and DocService, decide the output location, and migrate `DocService/sources/utilsDocService.js` to `utilsDocService.ts` as the minimal example. Complete the interop doc.

## Essential context
- Wave 0 of DIAG-docservice (P4), shared with DIAG-common (plan #3) and DIAG-common-b (wave 2 interop): one toolchain for both packages, installed once as a dev dependency of the root `package.json` (versions pinned in `npm-shrinkwrap.json`).
- Read `.theseus/adapter/interop-javascript-typescript.md` first. Use **TypeScript 7** (`typescript@^7.0.2`, native compiler). Confirm the recommended options against the TypeScript 7 release notes (`node_modules/typescript` docs or the package's `CHANGES.md`/README if present); do not reintroduce options deprecated in 6.0.
- **Output location (open decision, decide here):** prefer option (a): emit `.js` next to the `.ts` source and do not commit it (add an ignore rule scoped to emitted files, e.g. a pattern for `DocService/sources/utilsDocService.js`, or a generic rule plus a check). Option (b), `outDir: dist`, would break about 40 relative `require` paths and the `Makefile` `sed`/`cp` steps, so it would need packets outside this target. Record the choice and why in the interop doc.
- **Which artifact Jest runs.** TypeScript 7 has no programmatic API until 7.1, so `ts-jest` cannot use it. Choose one and record it: (1) Jest loads the `.ts` file through a type-stripping transform (Node 22.23 can strip types natively; a small custom Jest transform using `module.stripTypeScriptTypes` is acceptable), or (2) `tsc` emits before the tests run, inside `.theseus/oracle/unit.sh`. Whatever you choose, a stale emitted `.js` must not be able to satisfy the oracle by itself: if emitted files are used, the oracle must rebuild them first.
- `tsconfig.json` at the repository root (create it), covering `Common/sources` and `DocService/sources` with `allowJs: true`, `checkJs: false`, CommonJS output (`module: nodenext` with `.ts` files that use `require`/`module.exports` or `import x = require()`/`export =`, whichever keeps the exports shape identical). `npx tsc -p tsconfig.json --noEmit` must pass.
- **Production build.** `.docker/server.bake.Dockerfile` runs `pkg` on DocService. If `.ts` sources need compiling before `pkg`, add a root `npm run build:ts` script and call it in the Dockerfile before `pkg`. The `Makefile` is forbidden here: if it needs a change, spawn a packet.
- **Lint.** Do not add `typescript-eslint` in this packet (it needs the `@typescript/typescript6` alias until 7.1). Make `npm run lint:check` keep passing (ignore `.ts` files or emitted files as needed) and spawn a follow-up packet for `.ts` linting with `theseus packet new`.
- `utilsDocService.js` is required by `converterservice.js`, `DocsCoServer.js`, `fileuploaderservice.js`, `canvasservice.js` and its tests, all through `require('./utilsDocService')` style paths that must keep working unchanged.

## Suggested plan
1. Install `typescript@^7.0.2` as a root dev dependency; check its release notes for option changes.
2. Create `tsconfig.json`; choose the output location and the Jest strategy; wire `.theseus/oracle/unit.sh` and `tests/jest.config.js` accordingly.
3. Rename `utilsDocService.js` to `.ts` (git mv), add types (strict inside, `unknown` at external input), keep exports identical.
4. Run all three acceptance commands; update the interop doc (decisions + "Minimal example"); add the build step for the Dockerfile.
5. Spawn the `.ts` lint packet and any `Makefile` packet you needed.

## Executor log
- attempt 1: changed tsconfig.build.json, outside the target (rule R2)
- attempt 2: changed tsconfig.json, outside the target (rule R2)

## Spawned packets

## Review

## Lessons for the Atlas
