---
id: SPAWN
title: Fix differential/build.sh hashing of untracked files (sha1sum run from the wrong cwd)
type: refactor
priority: medium
module: oracle

origin:
  type: packet
  ref: PKT-0084

depends_on: []
requires: [documentserver, browser]

target:
  files:
    - .theseus/oracle/differential/build.sh
  create_in: []

context:
  cards: []
  references:
    - .theseus/queue/in-progress/PKT-0084-sdkjs-fork-land-hb-get-script-horizontal-directi.md

contract:
  preserve:
    - Cache key stays the HEAD tree plus a hash of the working diff and untracked files; same output dirs for a clean checkout
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
Fix differential/build.sh hashing of untracked files (sha1sum run from the wrong cwd).

## Essential context
- In build.sh, `git -C "$SRC" ls-files -o ... | xargs -0r sha1sum` runs sha1sum in the caller's cwd, but the paths
  are relative to `$SRC`: with any untracked file in the sdkjs checkout the script exits 123
  (`sha1sum: tests/common/libfont/script-direction.html: No such file or directory`), seen in PKT-0084.
- Fix: run the sha1sum from `$SRC` (e.g. `(cd "$SRC" && xargs -0r sha1sum)`), as the copy step below already does.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
