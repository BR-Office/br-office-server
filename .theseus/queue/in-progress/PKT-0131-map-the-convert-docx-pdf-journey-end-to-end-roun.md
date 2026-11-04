---
id: PKT-0131
title: Map the convert-docx-pdf journey end to end (round 3)
type: measure
role: diagnostician
priority: critical
exclusive: true
module: project
origin:
  type: plan
  ref: journey:convert-docx-pdf:dcb03039:r3
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
  - 'grep -q "^round: 3" .theseus/journeys/convert-docx-pdf.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/journeys/convert-docx-pdf.md'
  - 'grep -Eq "^total_ms: [0-9]" .theseus/journeys/convert-docx-pdf.md'
  - theseus validate
budget:
  max_files_changed: 8
  max_diff_lines: 2000
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5-b
  reviewer: null
---

## Goal
Map the user journey `convert-docx-pdf` (Convert a Word document to PDF through the server until the PDF is returned) end to end, as users meet it, against the integrated build: the project's main branch and the forks' collecting branches, not the installed package (which runs the original code). If `.theseus/oracle/serve-integrated.sh` does not exist, write it: it brings that build up and down on this machine. Make `bash .theseus/oracle/journeys/convert-docx-pdf.sh` work: it runs the journey several times against the integrated build and prints one line `total_ms=<p50> min_ms=<min> max_ms=<max> runs=<n>`. Then write `.theseus/journeys/convert-docx-pdf.md` with `goals_hash: dcb03039`, `round: 3` and `total_ms: <p50>` in its header, and a machine-readable ```yaml block: `stages:` (each with `id`, `module` (a module id of the adapter, or `project`), `files`, `functions`, `ms` and `share` in percent) and `unattributed_ms`. Break the journey down from the user's action to the last pixel: every stage the time goes through, in every module, with the files and functions that spend it (a stage above 5% of the total names its functions). The stages and `unattributed_ms` add up to `total_ms` within 5%. Round 3: compare with the earlier map if there is one.

## Essential context
- Planned by `theseus plan` from `goals.journeys` in the adapter. Every module's next diagnosis must cover every stage you give it, so name the module of each stage with the ids of `modules` in the adapter.
- `.theseus/oracle/baseline.md` and `.theseus/oracle/rounds/` hold the measurements made so far: evidence to cite, not a substitute for measuring.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
