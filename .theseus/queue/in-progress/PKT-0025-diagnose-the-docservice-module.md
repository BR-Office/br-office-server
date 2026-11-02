---
id: PKT-0025
title: Diagnose the docservice module
type: investigate
role: diagnostician
priority: high
module: docservice
origin:
  type: plan
  ref: diagnosis:docservice:dcb03039
depends_on: []
target:
  files:
  - .theseus/diagnosis/DIAG-docservice.md
  - .theseus/diagnosis/DIAG-docservice-b.md
  create_in:
  - .theseus/diagnosis
context:
  cards:
  - docservice
  references:
  - .theseus/spec/diagnosis-verdict.md
  - .theseus/oracle/baseline.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - 'grep -q "^verdict: " .theseus/diagnosis/DIAG-docservice.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/diagnosis/DIAG-docservice.md'
  - theseus validate
budget:
  max_files_changed: 3
  max_diff_lines: 700
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Diagnose the module `docservice` following `.theseus/prompts/diagnostician.md` and write the verdict to `.theseus/diagnosis/DIAG-docservice.md`, including the machine-readable packet plan of `.theseus/spec/diagnosis-verdict.md` §5. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.
- `.theseus/diagnosis/DIAG-docservice.md` exists but answers other goals: replace it. If `.theseus/diagnosis/DIAG-docservice-b.md` exists, delete it with `git rm` (it answers the old goals too).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
