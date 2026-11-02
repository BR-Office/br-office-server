---
id: PKT-0083
title: "Fix PKT-0080 acceptance: placeholder samples-dir and missing profile-fonts.js"
type: investigate
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0080

depends_on: []

target:
  files:
    - .theseus/queue/in-progress/PKT-0080-libfont-table-lookup-for-hb-get-script-horizonta.md
  create_in:
    - .theseus/oracle/perf/

context:
  cards: [sdkjs-common]
  references: []

contract:
  preserve:
    - PKT-0080 code change and Executor log stay as written; only its acceptance command changes
    - Existing oracle scripts in .theseus/oracle/perf/ keep their behaviour
  forbidden: []

acceptance:
  commands:
    - test -f .theseus/oracle/perf/profile-fonts.js
    - "! grep -q '<samples-dir>' .theseus/queue/in-progress/PKT-0080-*.md"

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
Make PKT-0080's acceptance runnable: merge `.theseus/oracle/perf/profile-fonts.js` (commit 75204fd, only on pkt/PKT-0072) to the base branch and replace the literal `<samples-dir>` in the acceptance with the real samples path (e.g. the output dir of `make-samples.py`). As written, the shell parses `<samples-dir>` as stdin redirection and fails before node starts (`samples-dir: No such file`), so no executor can pass it within target.files.

## Essential context
- Second rejection of PKT-0080 was this exact shell error; the code change itself is unaffected.
- The profiler measures the installed bundle in /var/www, so it also needs build+mirror (`sdkjs-mirror.sh`) of the patched common.js to show the gain.

## Suggested plan
- Cherry-pick profile-fonts.js from 75204fd (pkt/PKT-0072) into .theseus/oracle/perf/.
- Replace `<samples-dir>` in PKT-0080's acceptance with the real samples directory produced by make-samples.py.

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
