---
id: PKT-0098
title: Provision external/sdkjs.base in packet worktrees and document it in environment.md
type: refactor
priority: medium
module: oracle

origin:
  type: packet
  ref: PKT-0097

depends_on: []
requires: [documentserver, browser]

target:
  files:
    - .theseus/adapter/environment.md
  create_in: []

context:
  cards: [oracle]
  references:
    - .theseus/oracle/differential/build.sh
    - .theseus/queue/in-progress/PKT-0097-fix-differential-build-sh-hashing-of-untracked-f.md

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
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Provision external/sdkjs.base in packet worktrees and document it in environment.md.

## Essential context
- The differential oracle (`differential/build.sh` line 9) needs `external/sdkjs.base`: a checkout of upstream main of
  the sdkjs mirror. It was missing in the PKT-0097 worktree, so the acceptance oracle failed until it was created by hand.
- What worked: `git clone --depth 1 -b main file://<sdkjs mirror> external/sdkjs.base` (-> 9cea536, the base PKT-0093 used).
  `git clone --shared` of external/sdkjs could not reach main (shallow clone).
- Goal: document in `environment.md` how a packet worktree gets `external/sdkjs.base` (and, if the factory owns
  worktree setup, ask for it to be provisioned automatically).

## Suggested plan

## Executor log
- claude-opus-5-5, 2026-11-03. `external/sdkjs.base` was missing here too; created it with
  `git clone --depth 1 -b main file://$(git -C external/sdkjs remote get-url origin) external/sdkjs.base` -> 9cea536.
  It is excluded via the main repo's `.git/info/exclude` (`/external/sdkjs.base/`), so contract holds.
- Documented the recipe in environment.md (new subsection under "Other Euro-Office repositories").
- Decision: automatic provisioning is factory/worktree-setup work outside target.files, so requested it as a spawn
  (`.theseus/spawn/PKT-0098-factory-provisions-external-sdkjs-base-in-packet.md`), with an in-repo fallback in its context.
- Acceptance `bash .theseus/oracle/differential/sdkjs-common.sh`: PASS (3 cases).

## Spawned packets
- PKT-0099: Factory provisions external/sdkjs.base in packet worktrees

## Review

## Lessons for the Atlas
