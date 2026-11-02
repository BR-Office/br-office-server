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
  executor: null
  reviewer: null
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

## Spawned packets

## Review

## Lessons for the Atlas
