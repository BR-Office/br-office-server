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

## Spawned packets

## Review

## Lessons for the Atlas
