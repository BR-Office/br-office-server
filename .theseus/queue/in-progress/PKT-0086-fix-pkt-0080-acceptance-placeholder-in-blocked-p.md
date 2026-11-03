---
id: PKT-0086
title: Fix PKT-0080 acceptance placeholder in blocked/ packet file
type: investigate
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0083

depends_on: []

target:
  files:
    - .theseus/queue/blocked/PKT-0080-libfont-table-lookup-for-hb-get-script-horizonta.md
  create_in: []

context:
  cards: [sdkjs-common]
  references: []

contract:
  preserve:
    - PKT-0080 code change, Goal and Executor log stay as written (the log may keep quoting `<samples-dir>` as history)
    - Only the acceptance block of PKT-0080 changes
  forbidden: []

acceptance:
  commands:
    - "awk '/^acceptance:/,/^budget:/' .theseus/queue/*/PKT-0080-*.md | grep -q 'make-samples.py /tmp/eo-samples'"
    - "! awk '/^acceptance:/,/^budget:/' .theseus/queue/*/PKT-0080-*.md | grep -q '<samples-dir>'"
    - test -f .theseus/oracle/perf/profile-fonts.js

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5-b
  reviewer: null
---

## Goal
In `.theseus/queue/blocked/PKT-0080-*.md` replace the acceptance command's literal `<samples-dir>` with `python3 .theseus/oracle/perf/make-samples.py /tmp/eo-samples && node .theseus/oracle/perf/profile-fonts.js /tmp/eo-samples external/sdkjs 3`. Change only the acceptance block; leave the Executor log (which quotes `<samples-dir>` historically) as is.

## Essential context
- PKT-0083 targeted `queue/in-progress/PKT-0080-*`, but PKT-0080 is in `blocked/`, so the edit was outside its target (R2) and was reverted.
- profile-fonts.js is now on the base via PKT-0083.
- Acceptance suggestion: `grep -A20 '^acceptance:' <file> | grep -vq '<samples-dir>'` style check scoped to the acceptance block, not the whole file.

## Suggested plan
- Set target.files to PKT-0080's path in whatever queue state it is in when this packet is claimed (or use a glob).
- Edit only the acceptance command line; run the acceptance commands above.

## Executor log
- attempt 1: acceptance failed: `test -f .theseus/oracle/perf/profile-fonts.js`
- attempt 2: acceptance failed: `test -f .theseus/oracle/perf/profile-fonts.js`
- attempt 3: acceptance failed: `test -f .theseus/oracle/perf/profile-fonts.js`

## Spawned packets

## Review

## Lessons for the Atlas
