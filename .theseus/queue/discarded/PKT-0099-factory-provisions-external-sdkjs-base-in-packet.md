---
id: PKT-0099
title: Factory provisions external/sdkjs.base in packet worktrees
type: refactor
priority: medium
module: oracle

origin:
  type: packet
  ref: PKT-0098

depends_on: []
requires: [documentserver, browser]

target:
  files:
    - .theseus/oracle/differential/sdkjs-common.sh
    - .theseus/adapter/environment.md
  create_in: []

context:
  cards: [oracle]
  references:
    - .theseus/adapter/environment.md
    - .theseus/oracle/differential/build.sh

contract:
  preserve:
    - external/sdkjs.base stays git-ignored and is never committed
  forbidden: []

acceptance:
  commands:
    - bash .theseus/oracle/differential/sdkjs-common.sh

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
Factory provisions external/sdkjs.base in packet worktrees.

## Essential context
- PKT-0097 and PKT-0098 had to create `external/sdkjs.base` by hand; environment.md now documents the recipe
  (`git clone --depth 1 -b main file://<sdkjs mirror> external/sdkjs.base`).
- Ask: the factory's worktree setup (which already clones sdkjs/web-apps/core from ../.external mirrors) should also
  create `external/sdkjs.base` from mirror `main`. If factory code is not in this repo, the in-repo fallback is to have
  `sdkjs-common.sh` clone it on first run when missing (as `sdkjs-word.sh` does for the forms addon), and update
  environment.md accordingly.

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.21.9
- discard: already done in the product: Theseus 0.21.9 puts <checkout>.base next to every checkout of a forked repository; a project packet cannot change the factory

## Spawned packets

## Review

## Lessons for the Atlas
