---
id: PKT-0138
title: "serve-integrated: make x2t run the integrated sdkjs word bundle (stale sdk-all.bin V8 snapshot)"
type: investigate
priority: high
module: x2t

origin:
  type: packet
  ref: PKT-0131

depends_on: []
requires: [documentserver]

target:
  files:
    - .theseus/oracle/serve-integrated.sh
  create_in: []

context:
  cards: [x2t]
  references: []

contract:
  preserve:
    - "No change to the code of the project or of its forks"
  forbidden: []

acceptance:
  commands:
    - bash .theseus/oracle/serve-integrated.sh up
    - test /var/www/euro-office/documentserver/sdkjs/word/sdk-all.bin -nt /var/www/euro-office/documentserver/sdkjs/word/sdk-all.js
    - bash .theseus/oracle/journeys/convert-docx-pdf.sh
    - theseus validate

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: null
resume: false
---

## Goal
serve-integrated: make x2t run the integrated sdkjs word bundle (stale sdk-all.bin V8 snapshot).

## Essential context
PKT-0131 found (strace of x2t docx→pdf): DoctRenderer loads the V8 snapshot `sdkjs/word/sdk-all.bin`
(external/core/DesktopEditor/doctrenderer/editors.cpp GetSnapshotPath) when it exists, not `sdk-all.js`.
`serve-integrated.sh up` overlays sdk-all.js/sdk-all-min.js and removes `sdk-all.cache`, but leaves the packaged
`sdk-all.bin` (2026-11-02). So every x2t run (convert, save, the conversion inside open) uses the packaged
sdkjs word code, not the fork's collecting branch: the integrated build is integrated only in the browser.
Removing sdk-all.bin makes x2t regenerate it on the next run (first run ~1.45 s, then ~1.0 s, same output size).
Fix: on `up`, back up sdk-all.bin with the other files and delete it (or regenerate it as user ds); `down` restores it.
Re-measure the save and convert-docx-pdf journeys afterwards and say whether the numbers moved.

## Suggested plan

## Executor log
- attempt 1: the spawn request PKT-0138-factory-check-out-external-sdkjs-in-worktrees-wh.md still has template placeholders: fill in its target, contract and acceptance (rule R6)
- return: factory stopped by the 2-hour session limit
- attempt 2 (claude-opus-5-5):
  - Surprise 1: `external/sdkjs` is not checked out in this worktree (module x2t), so `up` failed at the webpack step.
    Decision: `up` clones the fork's `theseus` branch shallow into the git-excluded `external/sdkjs` when missing
    (same pattern as sdkjs-word.sh cloning the forms addon). Build then took ~1m40s.
  - Surprise 2: PKT-0131's premise "x2t regenerates sdk-all.bin on the next run" does not hold here: a plain docx→pdf
    run (as ds or root) only writes `sdk-all.cache`; `RunEditorWithSnapshot` (editors.cpp) only reads the .bin.
    The .bin is written only by `x2t -create-js-snapshots` (X2tConverter main.cpp → CDoctrenderer::CreateSnapshots,
    all five editors). Also `sdkjs/word` is `dr-xr-xr-x ds`, so ds cannot write there at all; root can.
  - Decision: on `up`, when word/sdk-all.bin is not newer than sdk-all.js: delete it, run `x2t -create-js-snapshots`
    as root (~15 s), chown the .bin files to ds, fail if it is still stale. The packaged .bin is already in the
    backup (`cp sdk-all*`), so `down` restores it. js/min are now copied only when they differ (cmp), so a repeated
    `up` is 0.06 s and does not regenerate the snapshot.
  - Measured (native package, 2 CPUs, load avg ~2-3.6 from other worktrees, noisy): convert-docx-pdf p50 RUNS=11:
    integrated 2003 / 1173 ms (two series), packaged (down, NO_INTEGRATED=1) 1853 ms; before the fix 1216 ms (RUNS=5).
    save p50 RUNS=5: integrated 6736 / 5778 ms, packaged 5836 ms. Verdict: the numbers did not move beyond noise;
    the fix is about correctness (x2t now runs the fork's word code), not speed.
  - No change in external/core. Not done: x2t snapshots of the other editors are regenerated too (packaged code,
    harmless), and the root-owned sdk-all.cache an x2t run as root leaves is removed by the next `up`.

## Spawned packets

## Review

## Lessons for the Atlas
