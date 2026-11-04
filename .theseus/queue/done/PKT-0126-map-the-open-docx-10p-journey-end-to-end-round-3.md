---
id: PKT-0126
title: Map the open-docx-10p journey end to end (round 3)
type: measure
role: diagnostician
priority: critical
module: project
origin:
  type: plan
  ref: journey:open-docx-10p:dcb03039:r3
depends_on: []
target:
  files: []
  create_in:
  - .theseus/journeys
  - .theseus/oracle
context:
  cards: []
  references:
  - .theseus/adapter/adapter.yaml
  - .theseus/oracle/baseline.md
  - .theseus/adapter/environment.md
contract:
  preserve:
  - No change to the code of the project or of its forks
  forbidden: []
allowed_commands:
- '*'
acceptance:
  commands:
  - 'grep -q "^round: 3" .theseus/journeys/open-docx-10p.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/journeys/open-docx-10p.md'
  - 'grep -Eq "^total_ms: [0-9]" .theseus/journeys/open-docx-10p.md'
  - theseus validate
budget:
  max_files_changed: 8
  max_diff_lines: 2000
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5-b
  reviewer: claude-opus-5-5
resume: false
---

## Goal
Map the user journey `open-docx-10p` (Select a 10-page Word document and wait until it is fully rendered in the browser (first open)) end to end, as users meet it, against the integrated build: the project's main branch and the forks' collecting branches, not the installed package (which runs the original code). If `.theseus/oracle/serve-integrated.sh` does not exist, write it: it brings that build up and down on this machine. Make `bash .theseus/oracle/journeys/open-docx-10p.sh` work: it runs the journey several times against the integrated build and prints one line `total_ms=<p50> min_ms=<min> max_ms=<max> runs=<n>`. Then write `.theseus/journeys/open-docx-10p.md` with `goals_hash: dcb03039`, `round: 3` and `total_ms: <p50>` in its header, and a machine-readable ```yaml block: `stages:` (each with `id`, `module` (a module id of the adapter, or `project`), `files`, `functions`, `ms` and `share` in percent) and `unattributed_ms`. Break the journey down from the user's action to the last pixel: every stage the time goes through, in every module, with the files and functions that spend it (a stage above 5% of the total names its functions). The stages and `unattributed_ms` add up to `total_ms` within 5%. Round 3: compare with the earlier map if there is one.

## Essential context
- Planned by `theseus plan` from `goals.journeys` in the adapter. Every module's next diagnosis must cover every stage you give it, so name the module of each stage with the ids of `modules` in the adapter.
- `.theseus/oracle/baseline.md` and `.theseus/oracle/rounds/` hold the measurements made so far: evidence to cite, not a substitute for measuring.

## Suggested plan

## Executor log
- return: container restarted; work kept (TEP-0010)
- Resumed the kept work (serve-integrated.sh, open-docx-10p.sh/-run.cjs, sample docx). Surprise: the runner hung forever.
  The sample lays out as **9 pages** in this build, and the runner waited for >= 10. It also never closed the browser on
  error, so a failed run hung the script. Fix: wait until `CDocument.FullRecalc.Id == null` (layout finished), then 2 rAF;
  record `pages`; close the browser in `finally`. `PAGES` is now 0, not 10.
- Measured: `total_ms=8340 min_ms=5699 max_ms=8547 runs=5` (integrated: sdkjs 0f61ccce overlaid; core and web-apps
  theseus == main). The load average was about 6 (another agent's differential oracle was running), so read shares, not ms.
- Decision: the stages are telescoping p50 marks, so unattributed_ms is 0. x2t ms comes from the converter log
  (Start Task→ExitCode, p50 299 ms); DocService gets the rest of loadDoc→Editor.bin request. The client window after
  Editor.bin is split with the PKT-0043 profile shares. That split is an estimate, labelled as such in the map.
  Spawned a profiling follow-up to replace it.
- Not done: no CPU profile in this round. There was no earlier journey map to compare with, so the comparison is
  against the baseline and the round-2 shares.

## Spawned packets
- PKT-0133: Profile the open-docx-10p client window per module (replace the PKT-0043 share estimate)

## Review
- Approved by claude-opus-5-5: Journey mapped against the integrated build, stages sum to total_ms, and the estimated split is labelled with a profiling follow-up recorded.

## Lessons for the Atlas
