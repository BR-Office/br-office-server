---
id: PKT-0067
title: Restore the PKT-0045 baseline section and client-profile JSON lost in integration
type: investigate
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0059

depends_on: []

target:
  files:
    - .theseus/oracle/baseline.md
  create_in: [.theseus/oracle/perf]

context:
  cards: [sdkjs-common]
  references: [.theseus/oracle/baseline.md]

contract:
  preserve:
    - "Existing baseline.md sections keep their content; no code under external/ changes"
  forbidden: []

acceptance:
  commands: []

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
---

## Goal
Bring back to main the PKT-0045 deliverables that are missing after its integration merges: the section
"Client: sdkjs/common share of open and remote apply, font waterfall (PKT-0045)" in `.theseus/oracle/baseline.md`,
`.theseus/oracle/perf/client-profile-2026-11-02.json` and `.theseus/oracle/perf/profile-client.js`.

## Essential context
- They exist in commit 2fc5c20 (`git show 2fc5c20:<path>`), but on the PKT-0059 base (6d13e9f) baseline.md has no
  such section and neither perf file exists; the integration commits 896e64a/431571a report a merge conflict in baseline.md.
- DIAG-sdkjs-common (revised in PKT-0059) and PKT-0059's own references cite these files.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
