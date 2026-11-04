---
id: PKT-0130
title: Map the save journey end to end (round 3)
type: measure
role: diagnostician
priority: critical
exclusive: true
module: project
origin:
  type: plan
  ref: journey:save:dcb03039:r3
depends_on:
- PKT-0126
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
  - 'grep -q "^round: 3" .theseus/journeys/save.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/journeys/save.md'
  - 'grep -Eq "^total_ms: [0-9]" .theseus/journeys/save.md'
  - theseus validate
budget:
  max_files_changed: 8
  max_diff_lines: 2000
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
---

## Goal
Map the user journey `save` (Close an edited Word document until the saved file is available) end to end, as users meet it, against the integrated build: the project's main branch and the forks' collecting branches, not the installed package (which runs the original code). If `.theseus/oracle/serve-integrated.sh` does not exist, write it: it brings that build up and down on this machine. Make `bash .theseus/oracle/journeys/save.sh` work: it runs the journey several times against the integrated build and prints one line `total_ms=<p50> min_ms=<min> max_ms=<max> runs=<n>`. Then write `.theseus/journeys/save.md` with `goals_hash: dcb03039`, `round: 3` and `total_ms: <p50>` in its header, and a machine-readable ```yaml block: `stages:` (each with `id`, `module` (a module id of the adapter, or `project`), `files`, `functions`, `ms` and `share` in percent) and `unattributed_ms`. Break the journey down from the user's action to the last pixel: every stage the time goes through, in every module, with the files and functions that spend it (a stage above 5% of the total names its functions). The stages and `unattributed_ms` add up to `total_ms` within 5%. Round 3: compare with the earlier map if there is one.

## Essential context
- Planned by `theseus plan` from `goals.journeys` in the adapter. Every module's next diagnosis must cover every stage you give it, so name the module of each stage with the ids of `modules` in the adapter.
- `.theseus/oracle/baseline.md` and `.theseus/oracle/rounds/` hold the measurements made so far: evidence to cite, not a substitute for measuring.

## Suggested plan

## Executor log
- 2026-11-04 claude-opus-5-5: `serve-integrated.sh` existed (PKT-0126); reused. Wrote `oracle/journeys/save.sh` + `save-run.cjs`
  (pattern of typing.sh). t0 = Playwright `page.close()` of the only editor tab after 5 typed letters were acknowledged;
  end = the example's stored file replaced (mtime/size, 10 ms poll). Stages from DocService/FileConverter DEBUG log marks
  (contiguous, so p50s sum to 5836 of 5853; unattributed 17 ms).
- Result: p50 5853 ms (7 runs, 5771-5978). 5006 ms = `savetimeoutdelay` sleep in `createSaveTimer`; 774 ms = x2t
  (doctrenderer applying changes + bin->docx); everything else ~40 ms.
- Surprise: the save is dominated by a configured sleep, not by computation. Spawned request (docservice) to skip it on
  explicit close.
- Not done: x2t's 774 ms is not split internally (converter deletes its temp dir; no x2t timing log). The x2t diagnosis
  must split process start / V8+sdk-all.js load / apply changes / docx write.
- No earlier save map to compare with; cited rounds/x2t-r2.md (x2t part of save 0.2-0.65 s on smaller docs).

## Spawned packets
- PKT-0137: Do not wait savetimeoutdelay (5 s) before saving an explicitly closed document

## Review
- Approved by claude-opus-5-5-b: save journey mapped end to end (5853 ms, 85% the configured savetimeoutdelay wait); stages add up exactly; follow-up spawned; the faulty changes-sent wait in save-run.cjs should go into a follow-up

## Lessons for the Atlas
