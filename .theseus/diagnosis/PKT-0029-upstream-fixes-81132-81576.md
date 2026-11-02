# PKT-0029 — Upstream crash fixes 81132 and 81576: port assessment

Source: `git clone https://github.com/ONLYOFFICE/server` (2026-11-02), `git log --all --grep`.
Full upstream patches saved next to this file: `PKT-0029-upstream-81132.patch`, `PKT-0029-upstream-81576.patch`.
Applicability tested with `git apply --check -C1 -v` against Euro-Office `main` (worktree base 258b862).

## Bug 81132 — client disconnect during file streaming crashes the process

- Commit `12ba395e` (S. Konovalov, 2026-04-16), merged to ONLYOFFICE `release/v9.4.0` via `3cf8b1fd` (PR #141, branch `fix/bug-s3`).
- Files: `DocService/sources/routes/static.js` (+14/-4), `DocService/sources/ai/aiProxyHandler.js` (+20/-13).
- Diff:
  - `static.js` cache middleware: in the `sendFile` callback and the outer `catch` (S3/Azure `pipeline(readStream, res)`), classify `ERR_STREAM_PREMATURE_CLOSE` / `ECONNRESET` / `ECONNABORTED` as debug-level "client disconnected", and only send `400` when `!res.headersSent`. The crash was writing a status after headers were already sent once the client aborted mid-stream.
  - `aiProxyHandler.js` `proxyRequest` catch: same classification; the error response (`pipeline(error.response.data, res)` or `res.status(500).json`) is sent only if `!res.headersSent` and is wrapped in its own try/catch.
- Applies to EO main: **yes**. `static.js` hunks apply cleanly (offset -7). `aiProxyHandler.js` fails only on hunk 1, a cosmetic comment change (em dash → hyphen) whose context differs; hunk 2 (the fix) matches EO code at lines ~297-306. Drop hunk 1 when porting.
- Risk: low. Pure error-path hardening, no behaviour change on success.
- Recommendation: **port**.

## Bug 81576 — SaveVersion not released after failed final assembly, prepare4shutdown hangs

- Commit `8585bcf4` (S. Konovalov, 2026-07-13), on ONLYOFFICE `master` only (not on any release branch checked).
- Files: `DocService/sources/canvasservice.js` (+11/-2), `DocService/sources/DocsCoServer.js` (+5/-3), new `DocService/sources/documentRecovery.js` (58 lines, AGPL header).
- Diff:
  - `commandSfcCallback`: a callback ACK no longer counts as success when the assembly errored (unless `CONVERT_CORRUPTED`); `storeForgotten` only on `!requestRes`. On a terminal assembly error (`status == SaveVersion && !needRetry && !isEncrypted && isError && !isErrorCorrupted`) the restored task status becomes `Ok` with `statusInfo = FILE_NOT_ASSEMBLED` ("recovery marker") instead of staying `SaveVersion`. Pending changes are kept for replay. `shutdown.js` waits for SaveVersion rows to reach 0, so the stuck row was what hung `prepare4shutdown`.
  - `DocsCoServer.endAuth` receives the task row and sends the `FILE_NOT_ASSEMBLED` warning to the editor when the marker is set (in addition to the forgotten-files case).
  - `documentRecovery.js`: `markAssemblyRecovery`, `isAssemblyRecovery(Status)` helpers.
- Applies to EO main: **yes, with one trivial conflict**. `DocsCoServer.js` (4 hunks, offset -9/-103) and the new file apply cleanly. `canvasservice.js` fails only on the `require` hunk (import list context differs); EO has every symbol the logic hunks need (`needRetry` l.1036, `isError` l.1040, `isErrorCorrupted` l.1041, `if (requestRes)` l.1263, `restore %d status` l.1295; `constants.FILE_NOT_ASSEMBLED = -201` exists).
- Risk: medium. Changes save-state semantics (a failed final assembly now leaves the doc `Ok`+marker instead of `SaveVersion`), touches the callback-success rule, and is very recent upstream (master only, no release). Needs a test of: failed assembly → shutdown completes; reopen shows warning and replays changes; corrupted-file path unchanged.
- Recommendation: **port after a test plan**, or wait for it to reach an upstream release branch.

## Human decision needed
1. Port 81132 now (low risk)? 
2. Port 81576 now with tests, or wait for upstream release?

## Verification by PKT-0050 (2026-11-02, fresh blobless clones of ONLYOFFICE/server and Euro-Office/server)
- Full SHAs confirmed: 81132 = `12ba395e20af71a8ccb366cbd5b2f86abdf0e510` (2026-04-16, merge `3cf8b1fd` 2026-04-17 into ONLYOFFICE `release/v9.4.0`); 81576 = `8585bcf40fa823fe84cad7983a022a097364e0fc` (2026-07-13, ONLYOFFICE `master` only). File stats match the above.
- **Euro-Office `release/v9.4.0` has no commit for 81132.** `git merge-base --is-ancestor 12ba395e` fails for both EO `release/v9.4.0` (tip `ccc73419`, 2026-03-29, before the fix) and EO `main` (tip `2e7a2a13`). No EO commit mentions 81132/81576 in its message. The upstream commits reach EO only on dependabot/feature branches (e.g. `feature/changes4forgotten`, `feature/checksum`), not on main or release.
- 81576 (`8585bcf4`) is absent from every EO ref.
- Not to be confused: EO main has `b29a4bae`/`07730e68` (2025-12-07, socket error handling on client disconnect) - an older, different fix; it does not cover the `static.js`/`aiProxyHandler.js` headersSent path.
- Conclusion unchanged: port 81132 (low risk); 81576 after a test plan.

