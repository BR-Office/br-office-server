---
id: PKT-0127
title: Map the open-docx-100p journey end to end (round 3)
type: measure
role: diagnostician
priority: critical
module: project
origin:
  type: plan
  ref: journey:open-docx-100p:dcb03039:r3
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
  - 'grep -q "^round: 3" .theseus/journeys/open-docx-100p.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/journeys/open-docx-100p.md'
  - 'grep -Eq "^total_ms: [0-9]" .theseus/journeys/open-docx-100p.md'
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
Map the user journey `open-docx-100p` (Select a 100-page Word document and wait until it is fully rendered in the browser (first open)) end to end, as users meet it, against the integrated build: the project's main branch and the forks' collecting branches, not the installed package (which runs the original code). If `.theseus/oracle/serve-integrated.sh` does not exist, write it: it brings that build up and down on this machine. Make `bash .theseus/oracle/journeys/open-docx-100p.sh` work: it runs the journey several times against the integrated build and prints one line `total_ms=<p50> min_ms=<min> max_ms=<max> runs=<n>`. Then write `.theseus/journeys/open-docx-100p.md` with `goals_hash: dcb03039`, `round: 3` and `total_ms: <p50>` in its header, and a machine-readable ```yaml block: `stages:` (each with `id`, `module` (a module id of the adapter, or `project`), `files`, `functions`, `ms` and `share` in percent) and `unattributed_ms`. Break the journey down from the user's action to the last pixel: every stage the time goes through, in every module, with the files and functions that spend it (a stage above 5% of the total names its functions). The stages and `unattributed_ms` add up to `total_ms` within 5%. Round 3: compare with the earlier map if there is one.

## Essential context
- Planned by `theseus plan` from `goals.journeys` in the adapter. Every module's next diagnosis must cover every stage you give it, so name the module of each stage with the ids of `modules` in the adapter.
- `.theseus/oracle/baseline.md` and `.theseus/oracle/rounds/` hold the measurements made so far: evidence to cite, not a substitute for measuring.

## Suggested plan

## Executor log
- attempt 1: the spawn request PKT-0127-profile-the-open-docx-100p-client-window-per-mod.md still has template placeholders: fill in its target, contract and acceptance (rule R6)
- Attempt after rejection (R6): filled target, contract, acceptance and `requires: [documentserver, browser]` of the spawn request `PKT-0127-profile-the-open-docx-100p-client-window-per-mod.md`. Journey measurement of the previous attempt (total_ms 4628) kept unchanged.
- Wrote `oracle/journeys/open-docx-100p.sh` + `-run.cjs` as a parametrized copy of the PKT-0126 10p runner (sample, timeout 240 s); `serve-integrated.sh` already existed.
- Sample: `large-100p.docx` of PKT-0016, copied from the example store (89 KB). Surprise: it lays out as 86 pages in this build.
- Result: total_ms=4628 (min 4493, max 5671, 5 runs + warm-up), load ~3. x2t p50 243 ms from converter log.
- Decision: client window split by PKT-0043 profile shares (estimate), as in the 10p map; spawned a request to profile it.
- Surprise: 100p total < 10p total (8 340) because PKT-0126 ran under load 6; size-dependent stages (layout after load, Editor.bin) do grow.
- Not done: no per-run CPU profile.

## Spawned packets
- PKT-0134: Profile the open-docx-100p client window per module (CPU profile of the journey)

## Review
- Approved by claude-opus-5-5-b: journey mapped with all three header fields, the stages add up exactly, the estimates are labelled and their follow-up spawn request is complete, contract and budget respected

## Lessons for the Atlas
