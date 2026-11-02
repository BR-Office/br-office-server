# Interop: JavaScript → TypeScript

## Toolchain: TypeScript 7

Migrations use **TypeScript 7** (`typescript@^7.0.2`, the native compiler written in Go, typically 8x to 12x faster on full builds than 5.x/6.x). Decided on 2026-11-02.

- Install it once as a dev dependency of the root `package.json` (shared by `Common` and `DocService`, pinned in `npm-shrinkwrap.json`), never globally.
- TypeScript 7 has **no stable programmatic API yet** (expected in 7.1). Tools that load the compiler as a library, such as `typescript-eslint`, must use the compatibility package `@typescript/typescript6` through an npm alias until 7.1. The compiler itself (type checking and build) runs on 7.
- `strict` is on by default and every option deprecated in 6.0 is an error. Do not reintroduce deprecated options (old `moduleResolution: node`/`node10`, `target: es5`, AMD/UMD/System output).
- Recommended `tsconfig.json` for this Node.js server (CommonJS, Node 20+):

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "allowJs": true,
    "checkJs": false,
    "outDir": "dist",
    "rootDir": "sources",
    "declaration": false,
    "sourceMap": true,
    "skipLibCheck": true,
    "esModuleInterop": true
  },
  "include": ["sources/**/*"]
}
```

The block above was the diagnosis proposal. The adopted configuration is in "Decisions (PKT-0009)" below: no `outDir`/`rootDir`, `noEmit`, explicit `types`, `erasableSyntaxOnly`.

**Output location** (found by the second diagnosis, DIAG-common-b): `outDir: dist` with `rootDir: sources` would break the relative `require('../../Common/sources/x')` paths used by about 40 files and the `Makefile`, which runs `cp` and `sed` in place on `Common/sources/commondefines.js` and `license.js`. Decided by PKT-0009: emit `.js` next to the `.ts` (see below).

## Decisions (PKT-0009, 2026-11-02)

1. **Output location: option (a), `.js` next to the `.ts`, not committed.** Every `require('./x')` and `require('../../Common/sources/x')` keeps resolving with no edit, the DocService `pkg`/`bin` entries keep pointing at `.js`, and the `Makefile` is untouched. Option (b), `outDir: dist`, would have needed packets for ~40 consumers and the `Makefile`. Each emitted file gets one explicit line in `.gitignore` and `.prettierignore` (gitignore cannot express "a `.js` with a sibling `.ts`"); ESLint inherits the `.gitignore` rules.
2. **tsc only type-checks; Node erases the types.** `tsconfig.json` has `noEmit: true`. The build is `npm run build:ts` = `node ts-strip.js`, which writes `foo.js` next to every `foo.ts` under `Common/sources` and `DocService/sources` with Node's `module.stripTypeScriptTypes` (Node >= 22.13; the image uses Node 24). Why not `tsc` emit: with `allowJs` over the whole source tree, emitting in place makes tsc overwrite its own `.js` inputs (TS5055), so it would need a second build config; the Docker image does not install root dev dependencies, so a tsc build would also need a root `npm ci` in the image; and erasing keeps every line/column, so stack traces point at the right `.ts` line without source maps. The cost: **only erasable syntax** is allowed (no `enum`, `namespace`, parameter properties, `import x = require()`, `export =`), enforced by `erasableSyntaxOnly: true`.
3. **Module shape: keep CommonJS as written.** Migrated files keep `const x = require('x')` and `module.exports.name = ...` (erasable, and the exports object stays byte-for-byte the same: no `__esModule` marker). Types for required modules come from type-only queries: `const os: typeof import('os') = require('os')`, `type Pipeline = import('sharp').Sharp`. Untyped packages (`config`, `ms`, `windows-locale`, `heic-decode`) and not-yet-migrated JS modules get a small local interface for the part the file uses.
4. **Which artifact Jest runs: the emitted `.js`, rebuilt first (option 2).** `.theseus/oracle/unit.sh` runs `node ts-strip.js` before Jest, so a stale or missing `.js` cannot satisfy the oracle; the root `npm run "unit tests"`/`tests`/integration scripts do the same. Jest needs no transform and runs exactly the file `pkg` ships. `tests/jest.config.js` is unchanged.
5. **Where the build runs.** `.docker/server.bake.Dockerfile` runs `npm run build:ts` in `/server` before `pkg`. The root `prepare` script also runs it, so `npm ci`/`npm install` at the root (factory setup, the `Makefile` grunt target) leaves the `.js` in place.
6. **`tsconfig.json` options, against the 6.0/7.0 defaults.** `strict` is the default in 6.0+ but is kept explicit. `types` defaults to `[]` since 6.0, so `"types": ["node"]` is required for `require`, `module`, `process` and `Buffer`. `moduleDetection: "force"` makes every `.ts` a module even though it has no `import`/`export` (otherwise two migrated files declaring `const os` would collide as global scripts); with `noEmit` it has no runtime effect. `esModuleInterop` is dropped (always on since 6.0). No deprecated option is used (`moduleResolution: nodenext`, `target: es2022`, no `baseUrl`, no `outFile`).
7. **Lint.** `eslint.config.js` ignores `**/*.ts` explicitly (ESLint 9 would skip them anyway); `.ts` linting with `typescript-eslint` is a follow-up packet.

## Minimal example

`tsconfig.json` (repository root, type-check only):

```json
{
  "compilerOptions": {
    "target": "es2022",
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "moduleDetection": "force",
    "types": ["node"],
    "allowJs": true,
    "checkJs": false,
    "strict": true,
    "erasableSyntaxOnly": true,
    "noEmit": true,
    "skipLibCheck": true
  },
  "include": ["Common/sources/**/*", "DocService/sources/**/*"]
}
```

Commands:

```bash
npx tsc -p tsconfig.json --noEmit   # type check (TypeScript 7, dev dependency)
npm run build:ts                     # emit .js next to each .ts (node ts-strip.js)
.theseus/oracle/unit.sh              # rebuilds, then runs the unit tests on the emitted .js
```

Migrated leaf: `DocService/sources/utilsDocService.ts` (emits the ignored `utilsDocService.js`). The pattern:

```ts
'use strict';
type SharpModule = typeof import('sharp');               // types from a package, erased at build
interface OperationContext { logger: Logger; getCfg<T>(property: string, defaultValue: T): T }

const ms: (value: string) => number = require('ms');      // untyped package: local signature
const config: {get<T>(setting: string): T} = require('config');
let sharp: SharpModule | null = null;

function localeToLCID(lang: string | null | undefined): number | undefined { /* ... */ }

module.exports.localeToLCID = localeToLCID;               // same exports shape as the old .js
```

Checklist to migrate the next file `foo.js`:

1. `git mv foo.js foo.ts`, add types (strict inside, `unknown` or a local interface at external input), erasable syntax only.
2. Add `path/to/foo.js` to `.gitignore` and `.prettierignore`.
3. Run `npx tsc -p tsconfig.json --noEmit`, `.theseus/oracle/unit.sh`, `npm run lint:check`.

## Mechanism

Gradual, file by file, inside the same Node.js process:

1. Add TypeScript 7 with `allowJs: true` and `checkJs: false`, compiling to CommonJS (the server uses `require`).
2. Migrate leaf modules first (modules nobody else in the package depends on, or with few dependents).
3. A migrated `foo.ts` keeps exporting exactly what `foo.js` exported (`module.exports` shape), so callers do not change in the same packet.

## Types, errors and memory across the boundary

- JavaScript callers see the compiled output, so the runtime contract is unchanged.
- Types start loose at the boundary (`unknown` for external input) and tighten inside the module.
- No change of behavior is allowed in a `migrate` packet: the unit tests must pass unchanged.

## Known pitfalls

- `this`-bound callbacks and `arguments` usage in old code.
- Modules that mutate their own `module.exports` at runtime.
- `config` reads with dynamic keys (`config.get(...)`) lose typing.
- Lint: the current `eslint.config.js` is for JavaScript; adding `typescript-eslint` needs the `@typescript/typescript6` alias until TypeScript 7.1 ships its API.
- `npx tsc` with TypeScript missing from `node_modules` does not fail cleanly: npx downloads the unrelated `tsc` package (or silently uses a global install). Install the root dev dependencies first.
- Root dev dependencies: `typescript@^7.0.2` and `@types/node@24.3.0` (the version already pinned in `npm-shrinkwrap.json` as a jest transitive). The shrinkwrap `typescript` entry was written by hand in PKT-0009 (the executor sandbox could not run `npm install` or reach the registry), so it has `version`/`resolved` but no `integrity` and no `requires`; npm fills both on the next `npm install` at the root. Run it once with network and commit the refreshed shrinkwrap.
- An emitted `.js` that was committed before migration stays tracked despite `.gitignore`: run `git rm --cached <file>.js` when migrating a file.
- `module.stripTypeScriptTypes` prints an `ExperimentalWarning` on Node 22; harmless. Non-erasable syntax makes the build throw, so `tsc` (`erasableSyntaxOnly`) catches it first.
- A `catch (e)` variable is `unknown` under `strict`: `(e as Error).stack` keeps the old behavior; an `instanceof` guard would change it.
