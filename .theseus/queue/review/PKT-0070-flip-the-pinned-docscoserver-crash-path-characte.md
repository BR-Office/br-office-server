---
id: PKT-0070
title: Flip the pinned DocsCoServer crash-path characterizations behind real guards
type: refactor
priority: medium
module: docservice

origin:
  type: packet
  ref: PKT-0064

depends_on: [PKT-0064]

target:
  files:
    - DocService/sources/DocsCoServer.js
    - tests/unit/docsCoServerCrashPaths.tests.js
  create_in: [tests/unit]

context:
  cards: [docservice]
  references:
    - .theseus/diagnosis/DIAG-docservice.md

contract:
  preserve:
    - "Tests other than the expectations tagged \"crash-prone: P4 target\" in docsCoServerCrashPaths.tests.js keep passing unchanged"
    - "Socket.IO message protocol for authenticated clients (sdkjs relies on it)"
  forbidden: []

acceptance:
  commands:
    - .theseus/oracle/unit.sh
    - npm run lint:check

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Add real guards for the DocsCoServer crash paths that PKT-0028 (P2) pinned with the tag
"crash-prone: P4 target", and update exactly those expectations in
tests/unit/docsCoServerCrashPaths.tests.js to the guarded behaviour.

## Essential context
PKT-0064 could not do this: its contract said "Existing tests keep passing unchanged" and the test
file was not in its target, so every guard that changes a pinned expectation was blocked.
Pinned expectations to flip (one guard each):
- conn without handshake: initFromConnection dereferences conn.handshake.url; today a TypeError is
  caught ("connection error: TypeError"), DROP sent and disconnect. Guard and drop with a clear log.
- unLockDocument / saveChanges before auth: conn.user.id dereference; today TypeError logged as
  "error receiving response: type = ... TypeError". Guard: ignore (or reply an error) when !conn.user.
- startForceSave(Form) with a conn without user: getExternalChangeInfo dereferences opt_conn.user;
  rejects TypeError today. Guard opt_conn.user.
- user without id: idOriginal becomes the string "undefined". Decide: reject auth or generate an id
  (check what sdkjs/integrators expect first).
- auth without data.user/token: PKT-0064 added only a warn log ("auth ignored: missing ...");
  the connection still dangles unauthenticated. Decide whether to disconnect.

## Suggested plan

## Executor log
Decisions (one guard per pinned expectation, each with a clear log line):
- No handshake: checked before `ctx.initFromConnection` in `io.on('connection')`; error log
  "connection without handshake data", DROP reason, disconnect (same outcome as before, no TypeError).
- `unLockDocument` / `saveChanges` before auth: ignored with a warn ("... ignored: connection is not
  authenticated"), no reply, no disconnect. Chose ignore over an error reply so no new message type or
  shape reaches sdkjs (Socket.IO protocol contract).
- `startForceSave` with a conn without user: early return `{code: UnknownError, time: null, inProgress: false}`
  plus warn, the same reply `forceSaveStart` already gives before auth. Surprise: guarding only
  `getExternalChangeInfo` (`opt_conn?.user`) moved the crash downstream to
  `converterservice.js:209` (`externalChangeInfo.lang` on undefined), outside the target, so the guard
  sits at the top of `startForceSave` instead.
- User without id: generate `uid-<Date.now()>-<8 hex>` and warn. Checked the installed web-apps
  (`/var/www/euro-office/documentserver/web-apps/apps/*/main/app.js`): when the integrator gives no
  user, web-apps itself uses `{id: "uid-" + Date.now()}`; so a generated id matches what clients
  expect, while the random suffix keeps two id-less users from being merged under "undefined".
  Rejecting auth would break integrators that omit the id.
- Auth without `data.token` or `data.user`: now ACCESS_DENIED + disconnect (log "auth rejected: missing
  user|token"). The untagged "auth without data.token" test still passes unchanged.
Surprises: PKT-0064's "auth ignored: missing ..." warn log is not on this branch (PKT-0064 was blocked,
not merged), so the else branch in `auth` is new here.
Oracle: one run of `.theseus/oracle/unit.sh` failed 2 timing tests in `tests/unit/request.tests.js`
(axios 300 ms timeouts, unrelated to this change); the next two runs passed fully (178 passed, 1 skipped).
`npm run lint:check` exits 0 (one pre-existing react-hooks warning).
Not done: nothing pending in scope.

## Spawned packets

## Review

## Lessons for the Atlas
