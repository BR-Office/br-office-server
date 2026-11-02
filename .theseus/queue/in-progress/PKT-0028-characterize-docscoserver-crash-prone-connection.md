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

## Spawned packets

## Review

## Lessons for the Atlas
