---
id: PKT-0094
title: 'Build the differential oracle for core: original against new'
type: characterize
priority: critical
module: x2t
origin:
  type: plan
  ref: differential:core
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
  - 'No change to the code of core: this packet only builds the oracle'
  forbidden: []
allowed_commands:
- '*'
requires:
- documentserver
- browser
acceptance:
  commands:
  - bash .theseus/oracle/differential/x2t.sh
budget:
  max_files_changed: 8
  max_diff_lines: 1500
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
rejected_reviews: 1
resume: false
---

## Goal
Write `.theseus/oracle/differential/x2t.sh`: each compares the original code of core (`external/core.base`, the upstream code the fork was made from) with the new code (`external/core`, the packet's branch with every change already merged into the fork) on the same inputs, as users meet them: open documents of each kind the module handles, apply scripted local edits and scripted remote (co-editing) changes, save, reopen, convert. It fails when the results differ (the saved document, what is shown, what is sent to other users), unless the difference is listed as intended in a file next to the script, and prints one timing line per case for both sides (original and new) so a reviewer sees the gain. Build each side where it can run for real (the editor in the browser against the running server; see `.theseus/adapter/environment.md`), caching builds by commit in `$THESEUS_CACHE_DIR`. It must pass now, with the changes already merged.

## Essential context
- Planned by `theseus plan` because the modules x2t change core through a fork and have no differential oracle. The factory runs `.theseus/oracle/differential/<module>.sh` last in the acceptance of every packet of these modules, and shows its output to the reviewer.
- `.theseus/oracle/baseline.md` records how earlier packets built and measured this code (for the editor: the webpack persistent cache must be cleared between builds).

## Suggested plan

## Executor log
- return: container restarted; factory restarted on Theseus 0.21.2, work kept (TEP-0010)
- block: agent `claude-opus-5-5` timed out after 90 min
- release: timed out at 90 min while building x2t from source (85% done); the build is cached by tree in THESEUS_CACHE_DIR, so a resumed attempt continues it
- resume (claude-opus-5-5): the x2t build was already cached (one tree, 83b890f3: core and core.base are at the same commit 59458e06, so one build serves both sides; proved to run, 54 libraries replaced). The review's points (browser-driven local + remote edits and combined save, run proof, core.base tie, content comparison, repeated timing) were already in the WIP scripts.
- surprise: the first full run failed on `text-10p.docx shown` with the ORIGINAL side unstable across its own repeats. Dumping both canvases and diffing pixel by pixel showed a red spell-check squiggle on one run only: the spellchecker service answers asynchronously, sometimes after the capture. Not x2t output.
- decision: `shown` is now read by `stableShown()`: spell check off (`asc_setSpellCheck(false)`), selection removed, focus blurred, then the canvas hash is sampled every 500 ms until 3 equal reads in a row. Checked 4 single-side docx runs (identical hash) and 3 repeats per side; then the acceptance command passed (direct PASS, browser PASS 3 cases x 2 repeats).
- not done: no intended differences exist yet (x2t.intended empty), so the FAIL path is only proven by the noise found above, not by a real core change.

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: add browser-driven scripted local and remote edits plus the save that combines them; prove the new-side build runs; tie the original side to core.base; compare saved outputs by content, not only size; repeat timing runs to reduce noise

## Lessons for the Atlas
- Canvas hashes in the editors are noisy from async sources (spellchecker squiggles, repaint, collaborator cursor labels): turn spell check off and wait for a stable hash before comparing what is shown.
- When a side is unstable against itself, diff the canvases pixel by pixel to find the source before adding tolerance.
