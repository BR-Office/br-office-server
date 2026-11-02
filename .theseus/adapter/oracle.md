# Project oracle

> See section 4 of `.theseus/spec/adapter.md`. This document defines what counts as proof.

## 1. What is the reference?

- **Unit tests (Jest)** in `tests/unit/`: `npm run "unit tests"`. They cover parts of `Common/sources/utils.js`, `operationContext`, request handling and SSRF protection, PDF signing (`FileConverter/sources/signing`), the runtime config manager and the Sentry reporter.
- **Lint and formatting**: `npm run lint:check` (ESLint) and `npm run format:check` (Prettier).
- **Integration tests** in `tests/integration/` need a running server and databases. They are not part of the pilot oracle.

## 2. How is it compared?

Tests pass or fail. A packet's acceptance runs the whole unit suite, so a change in one module cannot silently break another.

## 3. What is noise?

Tests that depend on time, the network or the file system can be flaky. Any flaky test found must be recorded as friction (`oracle/flaky`) and fixed by a `characterize` packet.

## 4. Known gaps

- `DocService/sources/DocsCoServer.js` (4,736 lines, the coordination server) has no unit tests.
- `DocService/sources/canvasservice.js`, `converterservice.js` and `wopiClient.js` have no unit tests.
- `Common/sources/utils.js` is only partly covered.
- No performance benchmark yet: `perf` packets cannot prove a gain.

Each gap that blocks a `refactor` or `migrate` verdict becomes a `characterize` packet first (rule R5 / D1).

## 5. Cost to run

| Version | Command | Approximate time |
|---|---|---|
| Install (once per worktree) | `npm ci && npm ci --prefix ./Common && npm ci --prefix ./DocService && npm ci --prefix ./FileConverter` | to be measured |
| Unit tests | `npm run "unit tests"` | to be measured |
