# PKT-0115 — Upstream fix 81576: how it works, what it changes, test plan before porting

Upstream commit: ONLYOFFICE/server `8585bcf40fa823fe84cad7983a022a097364e0fc` (S. Konovalov, 2026-07-13, `master` only).
Patch: `.theseus/diagnosis/PKT-0029-upstream-81576.patch`. Earlier assessment: `PKT-0029-upstream-fixes-81132-81576.md` (medium risk, "port after a test plan").
EO code read at worktree base `4434daa` (line numbers below are EO `main`, not upstream).

## 1. The bug on EO main today

`commandSfcCallback` (`DocService/sources/canvasservice.js` ~l.1026) runs when FileConverter finishes the final assembly of a document whose editing session closed.

1. Entry (l.1073-1098): `recoverTask` starts as `Ok/NO_ERROR`. If the row is `SaveVersion` with the matching `status_info` (or `UpdateVersion`), `recoverTask` becomes `SaveVersion/statusInfoIn`, i.e. "put the row back exactly as it was".
2. `isError = statusInfo != NO_ERROR`, `isErrorCorrupted = statusInfo == CONVERT_CORRUPTED` (l.1039-1040). On error the callback is still sent to the integrator with status `Corrupted` (`statusErr`).
3. l.1263: `if (requestRes)` — **any** successful ACK of the callback counts as a successful save: `isSfcSuccess = true`, `updateIfTask = undefined`, `cleanDocumentOnExitPromise` (changes deleted). This includes the case where assembly failed with a non-corrupted error (e.g. x2t crash/timeout): the integrator ACKs a `Corrupted` callback and EO throws the pending changes away.
4. If `requestRes` is false (no ACK, or ACK with error), and no retry is scheduled (retry is disabled during shutdown: `!docsCoServer.getIsShutdown()` l.1244, or backoff exhausted), l.1294-1305 restores `recoverTask.status` = **`SaveVersion`**. Nothing later moves the row out of `SaveVersion`.
5. `shutdown.js` l.73: the shutdown loop waits until `getCountWithStatus(SaveVersion) + remainingFiles <= 0`. A row stuck in `SaveVersion` keeps `prepare4shutdown` waiting until `EXEC_TIMEOUT`, and the shutdown returns `false` (timeout). That is bug 81576.

## 2. What the upstream fix does

Three changes:

| # | Where | Change |
|---|---|---|
| A | `commandSfcCallback`, `if (requestRes)` | becomes `if (requestRes && (!isError \|\| isErrorCorrupted))`. An ACK only counts as success if assembly succeeded, or the error was `CONVERT_CORRUPTED`. The `else` becomes `else if (!requestRes)` → `storeForgotten = true` only when there was no ACK. An ACKed non-corrupted error now falls through: no clean-up, `updateIfTask` kept. |
| B | `commandSfcCallback`, restore block | if `recoverTask.status == SaveVersion && !needRetry && !isEncrypted && isError && !isErrorCorrupted` ("terminal assembly error"), `documentRecovery.markAssemblyRecovery(recoverTask)` sets it to **`Ok` + `statusInfo = FILE_NOT_ASSEMBLED` (-201)** before the row is written. The row leaves `SaveVersion`, so the shutdown count drops. Pending changes stay in the DB for replay. |
| C | `DocsCoServer.endAuth` | gets the task row (`resultRow`) and sends the warning `FILE_NOT_ASSEMBLED` "File not assembled" to the editor when `isAssemblyRecovery(row)` (exact `Ok`/-201 match), in addition to the existing forgotten-files case. The marker is **not consumed**: each new open re-sends the warning until a later status change overwrites it. |

New file `DocService/sources/documentRecovery.js`: `markAssemblyRecovery`, `isAssemblyRecoveryStatus`, `isAssemblyRecovery` (pure, no I/O).

## 3. Save-state semantics it changes

| Situation (final assembly, `!isSfcm`, not encrypted) | EO main today | With 81576 |
|---|---|---|
| Assembly OK, callback ACKed | success, changes cleaned | unchanged |
| Assembly `CONVERT_CORRUPTED`, ACKed | success, changes cleaned | unchanged |
| Assembly other error (x2t crash/timeout), **ACKed** | treated as success; changes **deleted**; row cleaned | **not** success; changes kept; row → `Ok`/-201 marker; next open warns and replays changes |
| Assembly other error, **no ACK**, no retry (shutdown or backoff exhausted) | `storeForgotten`; row back to `SaveVersion` → **shutdown hangs** | `storeForgotten`; row → `Ok`/-201; shutdown proceeds |
| Any error, no ACK, retry scheduled (`needRetry`) | row back to `SaveVersion` | unchanged (marker not applied when `needRetry`) |
| Encrypted doc | row restored to its own status | unchanged (`!isEncrypted` guard) |
| Force save (`isSfcm`) | restore block skipped | unchanged |

Consequences to weigh:
- **Behaviour change visible to integrators**: an integrator that ACKs a `Corrupted` callback (status 3) for a crash-type error will now see the document re-open with pending changes and a "File not assembled" warning, instead of the changes being silently gone. It is the safer outcome (no data loss) but a different one.
- `Ok` + negative `status_info` is a new row state. Any code that reads `status == Ok` and ignores `status_info` (open path `canvasService.getOpenedAt`, GC in `gc.js`, `checkStatusFile`) will treat the document as openable. Upstream relies on this ("no new open conversion"); EO must confirm nothing in its own changes reads `status_info` of an `Ok` row differently. Check before porting: `grep -n "status_info\|statusInfo" DocService/sources/{gc,canvasservice,DocsCoServer,taskresult}.js`.
- The warning repeats on every open until the marker is overwritten (next save attempt, empty-cache reconvert, or successful assembly). Accepted upstream; noted as UX.
- `storeForgotten` + marker can both apply (no ACK case): the forgotten file and the warning are sent once, not twice (`sendDataWarning` is called in one `if`). Test it.

## 4. Characterization tests needed BEFORE porting

Pin today's behaviour first on EO main (so the port shows exactly which expectations flip), following the pattern of `tests/unit/docsCoServerCrashPaths.tests.js` (PKT-0028): jest, mocked `taskresult`/`baseConnector`/`storage`/`utils.sendServerRequest`, real `editorDataMemory`. Proposed file: `tests/unit/commandSfcCallback81576.tests.js`. Each test calls `canvasService.commandSfcCallback(ctx, cmd, false, false)` with a fake `cmd` (`getStatusInfo`, `getStatusInfoIn`, `getDocId`, `getSaveKey`, `getUserId`, `getAttempt`, `getForceSave`) and a row from mocked `taskResult.select`, and asserts on: the `updateIfTask` passed to `taskResult.updateIf`, whether `cleanDocumentOnExitPromise` was called, `storeForgotten` (storage copy to forgotten dir), and `addTask` retry.

| ID | Input | Today's expectation (pin) | Expected after port (flip?) |
|---|---|---|---|
| T1 | statusInfo `NO_ERROR`, ACK ok | success, clean called, no updateIf restore | same |
| T2 | `CONVERT_CORRUPTED`, ACK ok | success, clean called | same |
| T3 | error (e.g. `CONVERT_TIMEOUT` / `CONVERT`), ACK ok | success, **clean called** | **flip**: no clean, updateIf with `Ok`/-201 |
| T4 | error, no ACK (`sendServerRequest` throws 500), shutdown flag set (no retry) | updateIf `SaveVersion`, storeForgotten | **flip**: updateIf `Ok`/-201, storeForgotten |
| T5 | error, no ACK, retry available (attempt 0, not shutdown) | `needRetry`, row `SaveVersion` | same |
| T6 | error, no ACK, backoff exhausted (attempt = retries) | `SaveVersion` | **flip**: `Ok`/-201 |
| T7 | encrypted doc, error | row restored to own status | same |
| T8 | `isSfcm` (forcesave), error | no restore | same |
| T9 | `CONVERT_CORRUPTED`, no ACK | `SaveVersion`, storeForgotten | same (marker excludes corrupted) — note: corrupted+no ACK still stays `SaveVersion` and can still hang shutdown; out of 81576's scope |

`endAuth` warning (in `docsCoServerCrashPaths` style, fake connection):

| ID | Input | Today | After port |
|---|---|---|---|
| E1 | row `Ok`/`NO_ERROR`, no forgotten | no warning | same |
| E2 | row `Ok`/-201, no forgotten | no warning | **flip**: one `FILE_NOT_ASSEMBLED` warning |
| E3 | forgotten present | one warning | same |
| E4 | forgotten present + row `Ok`/-201 | one warning | still exactly one |
| E5 | row `Ok` with another negative status_info (legacy) | no warning | same (exact marker only) |

`documentRecovery.js` unit tests (port only): `markAssemblyRecovery` sets `Ok`/-201; `isAssemblyRecovery(null/undefined)` false; exact match only.

`shutdown.js` (unit, mocked `sqlBase.getCountWithStatus`, `editorStat`, pubsub, short timeouts):
- S1: count of SaveVersion goes 1 → 0 → returns `true` before `EXEC_TIMEOUT`.
- S2: count stays 1 → returns `false` after `EXEC_TIMEOUT` (pins the hang mechanism).

## 5. End-to-end check (after port, with the `documentserver` environment)

1. Open a docx in the editor (Playwright, `browser` env), type, close the tab.
2. Make final assembly fail with a non-corrupted error: e.g. temporarily replace x2t with a script that exits with a crash code, or set a 1 s `FileConverter.converter.maxprocesstime`.
3. Trigger `prepare4shutdown` (`/internal/cluster/inactive` PUT on DocService) → must return within the timeout; DB: `select status,status_info from task_result where id=...` → `1`/-201 (Ok/marker), not `2` (SaveVersion).
4. Restore x2t, reopen: editor shows "File not assembled"; the typed text is present (changes replayed); a normal close then saves and the marker is gone.
5. Repeat with a corrupted-output scenario → behaviour identical to before the port.

## 6. Porting mechanics

- `canvasservice.js` require hunk conflicts (import list differs): add `const documentRecovery = require('./documentRecovery');` by hand; the logic hunks apply.
- `documentRecovery.js` carries the 2026 upstream AGPL header; keep it (EO convention for ported files) or align with EO's header — licence decision for the human, not technical.
- Estimated: 3 source files (~75 lines) + ~3 test files.

## 7. Recommendation for the human decision

- **Port**, behind the characterization tests T1-T9, E1-E5, S1-S2 written first on EO main (one packet), then the port (second packet) where only T3, T4, T6, E2 flip.
- Reasons: the current code both hangs shutdown and **silently deletes pending changes** when an integrator ACKs a crash-type `Corrupted` callback (T3) — the fix removes a data-loss path, not only a hang.
- Reason to wait instead: upstream `master` only (no release branch, ~4 months old); the new `Ok`/-201 state is a protocol-level change integrators may notice. If EO prefers to wait, the characterization packet is still worth doing now.
- Open gap not fixed by 81576: `CONVERT_CORRUPTED` + no ACK + no retry still leaves `SaveVersion` (T9).
