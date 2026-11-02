---
id: PKT-0041
title: Profile x2t PDF export and save conversion
type: investigate
priority: medium
module: x2t
origin:
  type: plan
  ref: plan:x2t:dcb03039:P1
depends_on: []
target:
  files: []
  create_in:
  - .theseus/oracle/perf
  - .theseus/diagnosis
context:
  cards:
  - x2t
  references:
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
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
resume: false
---

## Goal
Split the time of raw x2t docx/xlsx/pptx -> pdf (empty templates and the PKT-0016 samples) and of a save conversion (Editor.bin + changes -> docx) into process start, CDocBuilder/V8 initialization, sdkjs script or snapshot load, layout in CDoctrenderer::Execute, and CPdfFile writing; record numbers in baseline.md and say which part dominates.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-x2t.md` (row `P1`).
Baseline PKT-0015/PKT-0018 - empty docx->pdf 0.65 s raw vs 70 ms for ODF; large files 1.3-6.5 s. Path is X2tConverter/src/lib/pdf_image.h:339 doct_bin2pdf. Use perf/strace/ltrace or timestamps from the installed binary; x2t lives in /var/www/euro-office/documentserver/server/FileConverter/bin. Check whether the package ships JS snapshots/cache (x2t -create-js-snapshots).

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: cd /home/claude/euro-office-server.theseus-worktrees/PKT-0041; ls .theseus/oracle/perf; ls /var/www/euro-office/document…; Bash: ls /var/www/euro-office/documentserver/server/FileConverter/bin; Bash: /var/www/euro-office/documentserver/server/FileConverter/bin/x2t 2>&1 | head -5; Bash: f=.theseus/spawn/PKT-0041-measure-x2t-pdf-export-save-phase-split-on-the-i.md; python3 - "$f" <<'EOF'
- **Blocked (not done):** the Goal's numbers were NOT measured. Session permissions refused running `x2t`
  and even `ls` of `/var/www/euro-office/...` (only the worktree is allowed). I did not work around it.
  `baseline.md` is not updated; no claim about which phase dominates is made.
- Decision: did a source-level split instead (`external/core`), recorded in
  `.theseus/diagnosis/PKT-0041-x2t-pdf-split.md`: one CDoctrenderer + V8 context per process;
  sdkjs is loaded from `sdkjs/<editor>/sdk-all.bin` snapshot only if built with `V8_SUPPORT_SNAPSHOTS` and the
  file exists, else full compile of sdk-all-min.js + AllFonts.js + sdk-all.js (optional `.cache`).
  Snapshot generation failure is only logged on stderr (`doctrenderer.cpp:1105`) — a silent slow path.
- Wrote an untested measurement script `.theseus/oracle/perf/x2t-split.sh` (strace-timestamp phase split).
- Spawned a follow-up (`requires: [documentserver]`) to run it with the needed permissions.
- Acceptance: the packet has no acceptance commands.
- block: the reviewer found an external blocker: The measurements need permission to run x2t, strace and perf and to read /var/www/euro-office/documentserver; the operator or factory must grant that access to this packet or the spawned documentserver follow-up.
- release: executors now run with every privilege (Rafael); git clone, x2t, strace, perf and system paths are allowed

## Spawned packets
- PKT-0051: Measure x2t PDF export/save phase split on the installed binary

## Review

## Lessons for the Atlas
