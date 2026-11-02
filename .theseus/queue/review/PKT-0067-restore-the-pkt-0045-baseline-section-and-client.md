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
  executor: claude-opus-5-5
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
- Restored the PKT-0045 section verbatim from `git show 2fc5c20:.theseus/oracle/baseline.md` (its lines 115-168) and placed it
  after the PKT-0043 section "Client: where the word editor's CPU goes", just before "End-to-end server (PKT-0015)",
  keeping the client sections together and in packet order. No existing line was removed (diff: 54 insertions, 0 deletions).
- Restored `.theseus/oracle/perf/client-profile-2026-11-02.json` and `profile-client.js` byte-for-byte from 2fc5c20.
- Surprise: main already holds PKT-0043's client section at the spot where PKT-0045 had its own; that is the merge
  conflict the integration commits resolved by dropping PKT-0045's side.
- Not done: did not re-run profile-client.js (no acceptance commands; restoring, not re-measuring). Numbers are as of 2fc5c20.

## Spawned packets

## Review

## Lessons for the Atlas
