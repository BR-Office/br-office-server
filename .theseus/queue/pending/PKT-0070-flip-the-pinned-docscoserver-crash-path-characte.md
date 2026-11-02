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
  executor: null
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

## Spawned packets

## Review

## Lessons for the Atlas
