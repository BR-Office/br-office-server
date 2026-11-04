---
id: PKT-0114
title: Port upstream fix 81132 for client abort during file streaming
type: refactor
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:r2:P2
depends_on: []
target:
  files:
  - DocService/sources/routes/static.js
  - DocService/sources/ai/aiProxyHandler.js
  create_in:
  - tests/unit
context:
  cards:
  - docservice
  references:
  - .theseus/diagnosis/DIAG-docservice.md
contract:
  preserve:
  - Existing tests keep passing; their assertions change only where the goal requires it, and the log says why
  forbidden: []
estimated:
  files: 3
  diff_lines: 160
  source: planner
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
  executor: claude-opus-5-5-b
  reviewer: null
---

## Goal
Apply the logic hunks of ONLYOFFICE commit 12ba395e (.theseus/diagnosis/PKT-0029-upstream-81132.patch) so an aborted client during streaming no longer sends a status after headers are sent, with a unit test that aborts a stream mid-way.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P2`).
PKT-0029 checked the logic hunks apply with git apply --check -C1; static.js:141 still calls res.sendStatus(400) without a headersSent check. Recommended low risk.

## Suggested plan

## Executor log
- Applied the logic hunks of upstream 12ba395e from `.theseus/diagnosis/PKT-0029-upstream-81132.patch` with `git apply -C1`. Decision: dropped the first aiProxyHandler hunk (comment wording only, "wins" vs "win"); its context no longer matched here and it carries no logic.
- static.js: sendFile callback and the catch block log client disconnects (ERR_STREAM_PREMATURE_CLOSE / ECONNRESET / ECONNABORTED) at debug and only send 400 when `!res.headersSent`. aiProxyHandler.js: same guard around the error response, wrapped in try/catch.
- New test `tests/unit/staticAbort.tests.js`: mounts the real static router on an ephemeral express server, mocks storage-base (needServeStatic true, createReadStream returns a never-ending Readable), forces the tenant storage to `storage-s3` via a spy on `Context.prototype.getCfg`, signs the URL with the config secret, aborts the client after the first chunk and checks no `sendStatus` is called and the source stream is destroyed. Verified it FAILS on the unpatched static.js (sendStatus(400) after headers sent) and passes with the fix.
- Not done: no unit test for the aiProxyHandler path (the packet asked for a stream-abort test; the static path covers it). No existing test assertions changed.
- Surprise: the cache middleware is not exported, so the test has to go through the router with storage mocked; `unit.sh <pattern>` does not narrow the run because the script already passes `unit`.
- Acceptance: `.theseus/oracle/unit.sh` 179 passed / 1 skipped; `npm run lint:check` 0 errors (1 pre-existing warning in AdminPanel).

## Spawned packets

## Review

## Lessons for the Atlas
