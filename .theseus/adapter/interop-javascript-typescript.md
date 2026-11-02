# Interop: JavaScript → TypeScript

## Toolchain: TypeScript 7

Migrations use **TypeScript 7** (`typescript@^7.0.2`, the native compiler written in Go, typically 8x to 12x faster on full builds than 5.x/6.x). Decided on 2026-11-02.

- Install it as a dev dependency of the package being migrated (`Common`, `DocService`...), never globally.
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

The first `interop` packet must confirm these options against the TypeScript 7 release notes and `CHANGES.md` before anything is migrated, and record the result here.

**Open decision: output location** (found by the second diagnosis, DIAG-common-b). `outDir: dist` with `rootDir: sources` would break the relative `require('../../Common/sources/x')` paths used by about 40 files and the `Makefile`, which runs `cp` and `sed` in place on `Common/sources/commondefines.js` and `license.js`. The first `interop` packet must choose between emitting `.js` next to the `.ts` sources (not committed) and changing the consumers' paths and the `Makefile`, and record the choice here before any file is migrated.

## Mechanism

Gradual, file by file, inside the same Node.js process:

1. Add TypeScript 7 with `allowJs: true` and `checkJs: false`, compiling to CommonJS (the server uses `require`).
2. Migrate leaf modules first (modules nobody else in the package depends on, or with few dependents).
3. A migrated `foo.ts` keeps exporting exactly what `foo.js` exported (`module.exports` shape), so callers do not change in the same packet.

## Types, errors and memory across the boundary

- JavaScript callers see the compiled output, so the runtime contract is unchanged.
- Types start loose at the boundary (`unknown` for external input) and tighten inside the module.
- No change of behavior is allowed in a `migrate` packet: the unit tests must pass unchanged.

## Minimal example

To be added by the first `interop` packet: `tsconfig.json`, the build step and one migrated leaf module.

## Known pitfalls

- `this`-bound callbacks and `arguments` usage in old code.
- Modules that mutate their own `module.exports` at runtime.
- `config` reads with dynamic keys (`config.get(...)`) lose typing.
- Lint: the current `eslint.config.js` is for JavaScript; adding `typescript-eslint` needs the `@typescript/typescript6` alias until TypeScript 7.1 ships its API.
