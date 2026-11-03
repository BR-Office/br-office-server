---
id: PKT-0097
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
  executor: claude-opus-5-5
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
- Change: in build.sh the untracked-file hash now runs `(cd "$SRC" && xargs -0r sha1sum)`, like the copy step; one line.
- Verified: with an untracked file in the checkout the key computation exits 0 and the key changes (…-b919861e8ce4);
  without it the key is the same as before (…-da39a3ee5e6b, empty-input hash), so clean-checkout output dirs are unchanged.
- Surprise: `external/sdkjs.base` was missing from this worktree, so the acceptance oracle failed at build.sh line 9.
  I created it (git-ignored, not committed) as `git clone --depth 1 -b main file://<sdkjs mirror>` -> 9cea536, the base
  PKT-0093 used. `git clone --shared` of external/sdkjs could not reach main (shallow). The factory should provision it.
- Acceptance: `bash .theseus/oracle/differential/sdkjs-common.sh` -> PASS (3 cases).
- Attempt 2 (after rejection): created the follow-up request with `theseus packet new` (type `chore` is not valid, used
  `refactor`), filled target/contract/acceptance/context, listed it under "Spawned packets". build.sh unchanged.

## Spawned packets
- Request `.theseus/spawn/PKT-0097-provision-external-sdkjs-base-in-packet-worktree.md`: provision `external/sdkjs.base`
  in packet worktrees and document it in `environment.md` (id assigned by the factory).

## Review

## Lessons for the Atlas
- The differential oracle needs `external/sdkjs.base` (upstream main of the sdkjs mirror); it is not always provisioned in packet worktrees.
