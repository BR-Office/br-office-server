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
  reviewer: claude-opus-5-5
---

## Goal
Map the user journey `convert-docx-pdf` (Convert a Word document to PDF through the server until the PDF is returned) end to end, as users meet it, against the integrated build: the project's main branch and the forks' collecting branches, not the installed package (which runs the original code). If `.theseus/oracle/serve-integrated.sh` does not exist, write it: it brings that build up and down on this machine. Make `bash .theseus/oracle/journeys/convert-docx-pdf.sh` work: it runs the journey several times against the integrated build and prints one line `total_ms=<p50> min_ms=<min> max_ms=<max> runs=<n>`. Then write `.theseus/journeys/convert-docx-pdf.md` with `goals_hash: dcb03039`, `round: 3` and `total_ms: <p50>` in its header, and a machine-readable ```yaml block: `stages:` (each with `id`, `module` (a module id of the adapter, or `project`), `files`, `functions`, `ms` and `share` in percent) and `unattributed_ms`. Break the journey down from the user's action to the last pixel: every stage the time goes through, in every module, with the files and functions that spend it (a stage above 5% of the total names its functions). The stages and `unattributed_ms` add up to `total_ms` within 5%. Round 3: compare with the earlier map if there is one.

## Essential context
- Planned by `theseus plan` from `goals.journeys` in the adapter. Every module's next diagnosis must cover every stage you give it, so name the module of each stage with the ids of `modules` in the adapter.
- `.theseus/oracle/baseline.md` and `.theseus/oracle/rounds/` hold the measurements made so far: evidence to cite, not a substitute for measuring.

## Suggested plan

## Executor log
- claude-opus-5-5-b, 2026-11-04. Wrote `oracle/journeys/convert-docx-pdf.sh` + `convert-docx-pdf-run.cjs` (ConvertService async,
  re-post every 20 ms, then GET the PDF; stages from DocService/converter DEBUG logs filtered by key). `serve-integrated.sh`
  already existed (PKT-0126) and was reused unchanged. Result: total_ms=1200 (min 1083, max 1251, 9 runs); x2t 97.8%.
- Decision: the user is an integrator calling the API, so no browser; async mode with 20 ms polling (sync mode quantizes to ~1 s,
  noted in the map). Sample = open-docx-10p.docx, so the number is comparable with the open journeys.
- Split x2t with standalone runs (docx→bin, empty docx→pdf, 10p docx→pdf) and strace timestamps: ~75 ms OOXML read,
  ~390 ms V8+snapshot start, ~585 ms layout+PDF drawing.
- Surprise: x2t loads the V8 snapshot `sdkjs/word/sdk-all.bin`, which serve-integrated.sh leaves packaged, so x2t never runs the
  integrated sdkjs (affects save too). Tested: moved it aside, x2t regenerated it (1451 ms then ~1 s), restored the original
  byte-identical (cmp). Could not fix it here (serve-integrated.sh is not in target.files): spawned a request.
- Round 3 but no earlier map of this journey; compared with baseline.md (PKT-0015) instead.

## Spawned packets
- PKT-0138: serve-integrated: make x2t run the integrated sdkjs word bundle (stale sdk-all.bin V8 snapshot)

## Review
- Approved by claude-opus-5-5: The journey is mapped with the required header, YAML and totals within 5%, the contract is kept, and the x2t snapshot problem is disclosed, A/B-checked and has a follow-up.

## Lessons for the Atlas
