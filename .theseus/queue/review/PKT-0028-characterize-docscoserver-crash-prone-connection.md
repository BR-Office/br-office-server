---
id: PKT-0028
title: Characterize DocsCoServer crash-prone connection and save paths
type: characterize
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:P2
depends_on: []
target:
  files: []
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
Pin, with editorDataMemory and mocked sockets/queues, the behaviour of auth with missing user name/permissions/tenant, client disconnect during save or file streaming, and forcesave after close.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P2`).
These are the paths of the upstream crash fixes listed in .theseus/oracle/baseline.md (PKT-0017). DocsCoServer.js has no tests today and 4 736 lines of global state.

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.15.3
- return: factory restarted on Theseus 0.16 (main-branch repair first)
- attempt 1: the executor's permissions refused: Bash: cd DocService; head -60 ../tests/unit/converterService.tests.js; cat ../tests/jest.config.js; grep -n "^exports\.\|^modu…; Bash: cd DocService && npx jest ../tests/unit/docsCoServerCrashPaths --inject-globals=false --config=../tests/jest.config.js 2…; Bash: .theseus/oracle/unit.sh docsCoServerCrash 2>&1 | grep -v "^\s*at \|console.log\|^$\|Array.forEach" | head -60; Bash: F=/tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0028/0204548c-a824-57b7-bea3-1783011bc81a/scratchp…; Bash: sed -i "s#jest.mock('socket.io'#jest.mock('./../../DocService/node_modules/socket.io'#" tests/unit/docsCoServerCrashPath…; Bash: sh /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0028/0204548c-a824-57b7-bea3-1783011bc81a/scratch…; Bash: cd /home/claude/euro-office-server.theseus-worktrees/PKT-0028/DocService/sources; sed -n 1344,1412p DocsCoServer.js; sed…; Bash: cd Common/sources; grep -n "getTenantLicense\|function setDefLicense\|getDefLicense" -A12 tenantManager.js | head -50; g…; Bash: npx prettier --check tests/unit/docsCoServerCrashPaths.tests.js; grep -n "pipeline(\|pipeHttpStreams\|\.pipe(" DocServic…; Bash: npx prettier --check tests/unit/docsCoServerCrashPaths.tests.js; Bash: .theseus/oracle/unit.sh > /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0028/0204548c-a824-57b7-be…
- executor (claude-opus-5-5): added `tests/unit/docsCoServerCrashPaths.tests.js` (27 tests). No source file changed.
- Decision: all socket handlers are closures inside `install()`, so the suite calls `install()` once with a
  fake socket.io `Server` (records `io.use` / `io.on('connection')`) and drives fake connections. Real
  `editorDataMemory`; mocked: pubsubRabbitMQ (init calls back, publish loops back like a broker),
  taskqueueRabbitMQ (records addTask/addDelayed), `baseConnector` (getTableColumns rejects so
  editorData.connect/callbackFunction never run; changes index/insert mocked), taskresult, storage,
  canvasservice, gc.startGC. License set with `license.readLicense()` + `setLicenseInfo` as `server.js` does.
- Decision: pin current behaviour even where it is ugly; every expectation P4 should flip is tagged
  `// crash-prone: P4 target`.
- Findings pinned (P4 targets): (1) connection without `handshake` → TypeError in
  `ctx.initFromConnection`, caught: DROP + disconnect; (2) `auth` without `data.user` or `data.token` is
  silently ignored — no reply, no disconnect, unauthenticated connection left open; (3) user without `id` gets
  idOriginal `"undefined"` / id `"undefined1"`; (4) `unLockDocument` and `saveChanges` before auth throw
  TypeError on `conn.user.id`, caught and logged (no disconnect); (5) `startForceSave(Form, …, conn)` with a
  conn without `user` (closed/never authed) rejects with TypeError from `getExternalChangeInfo` — the
  "forcesave after close" crash shape.
- Pinned as already safe: missing name → "Anonymous" (also firstname without lastname); missing permissions →
  editor; `forceSaveStart` before auth → UnknownError; `close`/disconnect before auth → early return;
  disconnect while `commandOpenStartPromise` or the changes index is pending → auth/save stop at
  CONN_CLOSED; last editor disconnect with changes → SaveVersion + `utils.sleep(5000)` + saveFromChanges;
  `close` → save without delay and the later disconnect is a no-op; forceSaveStart after close → NotModified.
- File streaming: `utils.pipeHttpStreams` swallows ERR_STREAM_PREMATURE_CLOSE/ECONNRESET and rethrows source
  errors (pinned). `canvasservice.downloadFile` uses raw `pipeline` but its catch handles premature close;
  `wopiClient.js:1212` also uses raw `pipeline` (not characterized). Upstream fix 81132 (baseline) remains
  unported; porting is a human decision already recorded in baseline.md.
- Surprises: `.theseus/oracle/unit.sh <pattern>` appends the arg to `--testPathIgnorePatterns`, so a bare
  pattern EXCLUDES the file (`--testPathPattern=x` works). log4js binds `console.log` at load, so log capture
  spies on the `log4js/lib/logger` prototype. A 5 s `savetimeoutdelay` sleep inside a disconnect leaked into
  the next test until `utils.sleep` was spied. Without `setLicenseInfo`, `getTenantLicense` returns undefined
  and every auth fails with "not iterable".
- Not done: `npx prettier --check` and running a scratch script were refused by permissions (lint passes).
  No follow-up spawned: P4 already exists in the plan and depends on this packet.

## Spawned packets

## Review

## Lessons for the Atlas
