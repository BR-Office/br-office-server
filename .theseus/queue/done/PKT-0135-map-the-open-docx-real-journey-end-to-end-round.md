---
id: PKT-0135
title: Map the open-docx-real journey end to end (round 3)
type: measure
role: diagnostician
priority: critical
module: project
origin:
  type: plan
  ref: journey:open-docx-real:dcb03039:r3
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
exclusive: true
acceptance:
  commands:
  - 'grep -q "^round: 3" .theseus/journeys/open-docx-real.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/journeys/open-docx-real.md'
  - 'grep -Eq "^total_ms: [0-9]" .theseus/journeys/open-docx-real.md'
  - theseus validate
budget:
  max_files_changed: 8
  max_diff_lines: 2000
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5-b
  reviewer: claude-opus-5-5
rejected_reviews: 1
---

## Goal
Map the user journey `open-docx-real` (Select .theseus/oracle/journeys/samples/aluno-moderno.docx (a real 11-page document with images, tables and CJK fonts) and wait until it is fully rendered in the browser, first open with a cold browser cache) end to end, as users meet it, against the integrated build: the project's main branch and the forks' collecting branches, not the installed package (which runs the original code). If `.theseus/oracle/serve-integrated.sh` does not exist, write it: it brings that build up and down on this machine. Make `bash .theseus/oracle/journeys/open-docx-real.sh` work: it runs the journey several times against the integrated build and prints one line `total_ms=<p50> min_ms=<min> max_ms=<max> runs=<n>`. Then write `.theseus/journeys/open-docx-real.md` with `goals_hash: dcb03039`, `round: 3` and `total_ms: <p50>` in its header, and a machine-readable ```yaml block: `stages:` (each with `id`, `module` (a module id of the adapter, or `project`), `files`, `functions`, `ms` and `share` in percent) and `unattributed_ms`. Break the journey down from the user's action to the last pixel: every stage the time goes through, in every module, with the files and functions that spend it (a stage above 5% of the total names its functions). The stages and `unattributed_ms` add up to `total_ms` within 5%. Round 3: compare with the earlier map if there is one.

## Essential context
- Planned by `theseus plan` from `goals.journeys` in the adapter. Every module's next diagnosis must cover every stage you give it, so name the module of each stage with the ids of `modules` in the adapter.
- `.theseus/oracle/baseline.md` and `.theseus/oracle/rounds/` hold the measurements made so far: evidence to cite, not a substitute for measuring.

## Suggested plan

## Executor log
- Wrote open-docx-real.sh + open-docx-real-run.cjs as copies of the 10p runner (sample path, 240 s timeout); serve-integrated.sh already existed and was reused unchanged.
- 5 runs + warm-up on a quiet VM (load 0.8→3.3): total_ms=4974 min 3710 max 5121; 11 pages every run. x2t p50 394 ms from converter log.
- Decision: client window split by the PKT-0043 CPU shares (estimate, stated in the map); no profile of this sample — recorded as follow-up, not spawned as packet (the map lists it).
- Attempt 2 (after review): Editor.bin-received p50 was taken from the unsorted run list (3339); sorted median is 3220. Recomputed editor-bin-download 342 ms (6.9 %), client split of 1283 ms (word 537, common 300, web-apps 182, browser 264), module totals and the x2t/Editor.bin comparison. Rechecked every other mark's median: correct. Stages still sum to 4974.
- Profiling follow-up now filed as a spawn request (.theseus/spawn/), requires documentserver + browser.
- Surprise: the real 2.8 MB doc took less wall time than PKT-0126's 10p sample because of machine load; x2t and Editor.bin shares double vs 10p.

## Spawned packets
- PKT-0139: Profile the open-docx-real client window (Editor.bin to last paint) with a CPU profile

## Review
- Rejected by claude-opus-5-5: Editor.bin-received p50 is 3220 ms not 3339; recompute editor-bin-download (342 ms, 6.9 %), the 1283 ms client split, module totals and the comparison claim; also file the profiling follow-up in .theseus/spawn and fill in Lessons for the Atlas
- Approved by claude-opus-5-5: arithmetic corrected and verified, stages sum to total_ms, profiling follow-up filed as a spawn request

## Lessons for the Atlas
