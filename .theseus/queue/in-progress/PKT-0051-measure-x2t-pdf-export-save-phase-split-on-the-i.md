---
id: PKT-0051
title: Measure x2t PDF export/save phase split on the installed binary
type: investigate
priority: medium
module: x2t

origin:
  type: packet
  ref: PKT-0041

depends_on: []
requires: [documentserver]

target:
  files:
    - .theseus/oracle/perf/x2t-split.sh
  create_in:
    - .theseus/oracle/perf
    - .theseus/diagnosis

context:
  cards: [x2t]
  references:
    - .theseus/diagnosis/PKT-0041-x2t-pdf-split.md
    - .theseus/diagnosis/DIAG-x2t.md

contract:
  preserve:
    - Existing tests keep passing unchanged
  forbidden: []

acceptance:
  commands: []

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
Run `.theseus/oracle/perf/x2t-split.sh` (fix it as needed) on the installed x2t for empty docx/xlsx/pptx, the PKT-0016 samples and a save conversion (Editor.bin + changes -> docx); record per-phase numbers (start, V8 init, sdkjs script/snapshot load, layout, PDF write) in baseline.md, say which dominates, and whether sdkjs/*/sdk-all.bin or .cache ship and load.

## Essential context
PKT-0041 could not run or list /var/www/euro-office/documentserver/server/FileConverter/bin (session permissions limited to the worktree). The executor session must be allowed to execute the installed x2t, strace/perf and read /var/www/euro-office. Static pipeline analysis: .theseus/diagnosis/PKT-0041-x2t-pdf-split.md. The script is an untested draft.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
