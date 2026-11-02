---
id: PKT-0064
title: Guard DocsCoServer crash-prone paths
type: refactor
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:P4
depends_on:
- PKT-0028
target:
  files:
  - DocService/sources/DocsCoServer.js
  create_in:
  - tests/unit
context:
  cards:
  - docservice
  references:
  - .theseus/diagnosis/DIAG-docservice.md
contract:
  preserve:
  - Existing tests keep passing unchanged
  forbidden: []
acceptance:
  commands:
  - .theseus/oracle/unit.sh
  - npm run lint:check
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Add the missing null/undefined guards and error handling found by P2 and fix the editorStat fallback at DocsCoServer.js:155 (new editorDataStorage() used for editorStat), with tests.

## Essential context
- Wave 1 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P4`).
Crash fixes upstream are almost all such guards in DocsCoServer.js, canvasservice.js and converter.js (baseline PKT-0017).

## Suggested plan

## Executor log
- claude-opus-5-5, 2026-11-02. Baseline oracle green before edits (178 passed, 1 skipped).
- **Conflict found:** `contract.preserve` says existing tests stay unchanged and the P2 test file
  `tests/unit/docsCoServerCrashPaths.tests.js` is not in `target.files`, yet P2 pinned every
  "crash-prone: P4 target" as current behaviour (TypeError strings in logs/rejections, `idOriginal === 'undefined'`).
  Any real guard on those paths flips a pinned expectation, so they are **not done here**. Classification:
  no-handshake conn, unLockDocument/saveChanges before auth, startForceSave(Form) without user, user without id: blocked;
  auth without user/token: only absences are pinned, so a warn log was added (behaviour unchanged).
  I did not fake guards that still throw TypeError to keep the regexes green.
- **Done:** editorStat fallback at old line 155 used `new editorDataStorage()`; now all three storages
  (editorData, editorStat, editorStatProxy) go through a new exported `createStorageInstance(module, className, ...args)`
  that prefers the named class, falls back to the legacy constructor of the *same* module, and throws a clear
  TypeError otherwise. `editorStatProxy` (REDIS_SERVER_DB_KEYS_NUM) had no fallback at all; now it has.
- `auth`: `ctx.logger.warn('auth ignored: missing user|token')` when the auth message lacks token or user (was silent).
- Tests: new `tests/unit/docsCoServerGuards.tests.js` (5 tests: helper paths + default-config instances).
  The auth warn log is not unit-tested (would need the P2 socket harness copied); left to the follow-up.
- Upstream fixes 81132/81576 (PKT-0029) live mostly outside this target (static.js, aiProxyHandler.js, canvasservice.js): not touched.
- Spawned: request to flip the pinned characterizations with real guards (target includes the P2 test file).
- Acceptance: `.theseus/oracle/unit.sh` 183 passed / 1 skipped; `npm run lint:check` exit 0 (1 pre-existing AdminPanel warning).

## Spawned packets
- PKT-0070: Flip the pinned DocsCoServer crash-path characterizations behind real guards

## Review

## Lessons for the Atlas
