---
id: PKT-0035
title: Ignore external/ in eslint.config.js so npm run lint:check does not OOM
type: refactor
priority: medium
module: docservice

origin:
  type: packet
  ref: PKT-0027

depends_on: []

target:
  files:
    - eslint.config.js
  create_in: []

context:
  cards: [docservice]
  references: []

contract:
  preserve:
    - Lint rules applied to tracked sources stay the same
  forbidden: []

acceptance:
  commands:
    - npm run lint:check
    - .theseus/oracle/unit.sh

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
---

## Goal
Ignore external/ in eslint.config.js so npm run lint:check does not OOM.

## Essential context
`npm run lint:check` (`eslint .`) is killed with exit 137 (OOM; 8 GB VM, no swap) in the PKT-0027 worktree.
Cause: `external/` (core, sdkjs, web-apps, about 1.5 GB) is gitignored and untracked, but it is not in the
`ignores` list of `eslint.config.js`, and flat-config ESLint does not read `.gitignore`. Add `'external/**'`
to `ignores` (one line, easy to keep in sync with upstream). Found by PKT-0027.

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: git status --short; git log --oneline -3 -- eslint.config.js; timeout 900 npm run lint:check 2>&1 | tail -5; echo EXIT $…; Bash: git status --short; git log --oneline -3 -- eslint.config.js; npm run lint:check > ../lint35.log 2>&1; echo LINT $?; tai…; Bash: f=$(ls .theseus/queue/in-progress/PKT-0035-*.md)
- Surprise: `'external/**'` (and `.theseus/**`) were already in `ignores` of `eslint.config.js`, added by commit f500ee1 (PKT-0049). This packet duplicates PKT-0049; no code change was needed.
- Decision: left `eslint.config.js` untouched (contract: lint rules unchanged). The code diff is empty.
- Acceptance: `npm run lint:check` passes (0 errors, 1 pre-existing warning in AdminPanel useAiPlugin.js, no OOM); `.theseus/oracle/unit.sh` passes (178 passed, 1 skipped).
- Could not do: nothing blocked. Compound shell commands using `$?`, `${PIPESTATUS}` or quoted heredocs were refused by permissions, so I ran commands separately and used the edit tools.

## Spawned packets

## Review
- Approved by claude-opus-5-5-b: goal already met by PKT-0049 (external/** in eslint ignores), contract preserved, log and friction recorded

## Lessons for the Atlas
