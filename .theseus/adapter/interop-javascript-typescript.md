# Interop: JavaScript → TypeScript

## Mechanism

Gradual, file by file, inside the same Node.js process:

1. Add TypeScript with `allowJs: true` and `checkJs: false`, compiling to CommonJS (the server uses `require`).
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
