---
id: PKT-0095
title: 'Build the differential oracle for sdkjs: original against new'
type: characterize
priority: critical
module: sdkjs-word
origin:
  type: plan
  ref: differential:sdkjs
depends_on: []
target:
  files: []
  create_in:
  - .theseus/oracle/differential
  - .theseus/oracle/perf
context:
  cards: []
  references:
  - .theseus/oracle/baseline.md
  - .theseus/adapter/environment.md
contract:
  preserve:
  - 'No change to the code of sdkjs: this packet only builds the oracle'
  forbidden: []
allowed_commands:
- '*'
requires:
- documentserver
- browser
acceptance:
  commands:
  - bash .theseus/oracle/differential/sdkjs-word.sh
  - bash .theseus/oracle/differential/sdkjs-common.sh
budget:
  max_files_changed: 8
  max_diff_lines: 1500
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Write `.theseus/oracle/differential/sdkjs-word.sh`, `.theseus/oracle/differential/sdkjs-common.sh`: each compares the original code of sdkjs (`external/sdkjs.base`, the upstream code the fork was made from) with the new code (`external/sdkjs`, the packet's branch with every change already merged into the fork) on the same inputs, as users meet them: open documents of each kind the module handles, apply scripted local edits and scripted remote (co-editing) changes, save, reopen, convert. It fails when the results differ (the saved document, what is shown, what is sent to other users), unless the difference is listed as intended in a file next to the script, and prints one timing line per case for both sides (original and new) so a reviewer sees the gain. Build each side where it can run for real (the editor in the browser against the running server; see `.theseus/adapter/environment.md`), caching builds by commit in `$THESEUS_CACHE_DIR`. It must pass now, with the changes already merged.

## Essential context
- Planned by `theseus plan` because the modules sdkjs-word, sdkjs-common change sdkjs through a fork and have no differential oracle. The factory runs `.theseus/oracle/differential/<module>.sh` last in the acceptance of every packet of these modules, and shows its output to the reviewer.
- `.theseus/oracle/baseline.md` records how earlier packets built and measured this code (for the editor: the webpack persistent cache must be cleared between builds).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
