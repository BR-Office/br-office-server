# Project oracle

> See section 4 of `.theseus/spec/adapter.md`. This document defines what counts as proof.

## 1. What is the reference?

- **Unit tests (Jest)** in `tests/unit/`, run by `.theseus/oracle/unit.sh` (the upstream `npm run "unit tests"` minus the one network-dependent test, see section 3). They cover parts of `Common/sources/utils.js`, `operationContext`, request handling and SSRF protection, PDF signing (`FileConverter/sources/signing`), the runtime config manager and the Sentry reporter.
- **Lint and formatting**: `npm run lint:check` (ESLint) and `npm run format:check` (Prettier).
- **Integration tests** in `tests/integration/` need a running server and databases. They are not part of the pilot oracle.

## 2. How is it compared?

Tests pass or fail. A packet's acceptance runs the whole unit suite, so a change in one module cannot silently break another.

## 3. What is noise?

- `tests/unit/mailService.tests.js` ("Transporters life cycle") creates a test account on `api.nodemailer.com`, so it fails without internet access (`getaddrinfo ENOTFOUND`). The oracle script excludes it; it still runs in the upstream CI.

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
| Install (once per worktree, `factory.setup`) | `npm ci` in the root, `Common`, `DocService` and `FileConverter` | about 70 s |
| Unit tests | `.theseus/oracle/unit.sh` | about 6 s |
| Lint | `npm run lint:check` | about 4 s |

## 6. Baseline (2026-11-02, commit 0567757)

- Unit tests: 9 suites, 117 passed, 1 skipped (mail test excluded). With the mail test and no network: 1 failure.
- Lint: 0 errors, 1 warning.
