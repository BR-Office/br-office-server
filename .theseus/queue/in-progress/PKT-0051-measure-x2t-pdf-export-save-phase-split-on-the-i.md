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
- Ran `x2t-split.sh` on the installed x2t (native 9.3.7-1), 3 runs each, for empty docx/xlsx/pptx, the big PKT-0018 samples and two save conversions (Editor.bin made by x2t + `changes0.json` = `[]`). Results: `.theseus/diagnosis/PKT-0051-x2t-split.md`.
- Script fixes: worked as-is; renamed the save output (`save-save-*` -> `out-*`) and added a `sdk-files=` column listing which sdk-all.* files were opened.
- Findings: empty docs — script load (~0.37-0.44 s) and first Execute (~0.3-0.8 s) dominate; big docs — JS layout dominates (54-88 %), then the writer. `sdk-all.cache` ships and loads; `sdk-all.bin` is looked up (ENOENT) but not shipped.
- Decision: `.theseus/oracle/baseline.md` is outside target/create_in, so numbers went into the diagnosis file and a spawn request asks for the baseline update.
- Surprise: the PKT-0041 diagnosis already held a table of the same shape; my numbers agree within noise (±30 % on big inputs on this 2-CPU VM).
- No real change set was available, so the save measures the fixed cost only. `acceptance.commands` is empty: nothing to run.

## Spawned packets

## Review

## Lessons for the Atlas
- x2t: fixed cost per conversion ≈ 0.4 s script load + 0.3-0.8 s first Execute; process start + V8 init < 0.1 s. A V8 snapshot (sdk-all.bin, looked up but not shipped) or a persistent renderer is what removes it.
- Large xlsx -> pdf is a JS layout problem (≈ 51 s of 58 s for 50k rows).
