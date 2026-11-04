---
id: PKT-0108
title: Profile the first-Execute warm-up of x2t PDF export and prototype in-process cuts
type: investigate
priority: medium
module: x2t
origin:
  type: plan
  ref: plan:x2t:dcb03039:r2:P2
depends_on: []
target:
  files: []
  create_in:
  - .theseus/diagnosis
  - .theseus/oracle/perf
context:
  cards:
  - x2t
  references:
  - .theseus/diagnosis/DIAG-x2t.md
contract:
  preserve:
  - Existing tests keep passing; their assertions change only where the goal requires it, and the log says why
  forbidden: []
requires:
- documentserver
estimated:
  files: 2
  diff_lines: 300
  source: planner
acceptance:
  commands:
  - test -s .theseus/diagnosis/PKT-x2t-r2-warmup.md
  - theseus validate
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: null
  reviewer: null
resume: true
---

## Goal
With sdk-all.bin snapshots on, split the ~0.55-1.1 s fixed cost of empty docx/xlsx/pptx -> pdf (x2t-r2.md) inside the first CDoctrenderer::Execute (js_speed=1 laps, V8 inspector profile via x2t-cpuprofile.js) and prototype, on a build of the core fork, a snapshot taken after a warm-up run and V8 flag changes; record per-option gain (median of 5, direct timing) and corpus equality in .theseus/diagnosis/PKT-x2t-r2-warmup.md, and say which option P3 should implement.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-x2t.md` (row `P2`).
external/core is a writable fork (BR-Office/br-office-core); build with .theseus/oracle/differential/x2t-build.sh (cached by tree). Snapshot code in DesktopEditor/doctrenderer/doctrenderer.cpp (createJSSnapshots, sdk-all.bin load). PKT-0065 found snapshots gain only ~0.1 s.

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.23.2, work kept
- Decision: target.files is empty, so no core file was changed; every prototype runs on the installed x2t. V8 flags go in through an LD_PRELOAD shim (`oracle/perf/x2t-v8flags-shim.c`) calling the `v8::V8::SetFlagsFromString` exported by libdoctrenderer.so; the "warm snapshot" is approximated by snapshots made under `--no-lazy` (kKeep keeps all bytecode). A real post-open snapshot was not built (needs native embeds in the snapshot creator) and is sized in the note instead.
- Decision: side layouts (bin copy + sdkjs symlink farm with own sdk-all.bin) in the scratch dir, so the live server and other worktrees are untouched (`oracle/perf/x2t-warmup.sh`).
- Surprise: VM shared with other sessions (load 3.3-4.7 on 2 CPUs): wall medians moved up to 60 % between runs, so the timing script also records child CPU time; only deltas >= 0.15 s in both columns would count. None reached it.
- Surprise: the eager snapshot is slower (blobs 2.2x larger), and `--max-lazy` crashes docx -> pdf (exit -4). The CPU profile shows the warm-up is mostly real JS execution (fonts, default styles, reading, layout), not compile.
- Result: no in-process option >= 0.2 s; corpus equal for the eager snapshot and --no-lazy-feedback-allocation. Verdict in .theseus/diagnosis/PKT-x2t-r2-warmup.md: P3 should not implement an in-process cut; persistent converter is the remaining lever.
- Not done: no fork build (nothing to build: no core change); xlsx was not CPU-profiled (laps and timing only).
- block: the reviewer found an external blocker: Goal requires a post-warm-up snapshot built on the core fork, but target.files lists no external/core files (doctrenderer.cpp, v8_base.cpp); the planner must add them or decide the profile-based upper bound is enough for P3 (also add the missing xlsx profile)
- release: Theseus 0.23.3: an investigation may prototype in external/core (not in the scope check, never merged); prototype the post-warm-up snapshot there and add the missing xlsx profile, as the reviewer asked
- return: factory stopped by the session's 2-hour limit; restarted on Theseus 0.24.0 (journeys), work kept
- return: factory stopped by the 2-hour session limit

## Spawned packets

## Review

## Lessons for the Atlas
