---
id: PKT-0036
title: Diagnose the x2t module
type: investigate
role: diagnostician
priority: high
module: x2t
origin:
  type: plan
  ref: diagnosis:x2t:dcb03039
depends_on: []
target:
  files: []
  create_in:
  - .theseus/diagnosis
context:
  cards:
  - x2t
  references:
  - .theseus/spec/diagnosis-verdict.md
  - .theseus/oracle/baseline.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - 'grep -q "^verdict: " .theseus/diagnosis/DIAG-x2t.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/diagnosis/DIAG-x2t.md'
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
Diagnose the module `x2t` following `.theseus/prompts/diagnostician.md` and write the verdict to `.theseus/diagnosis/DIAG-x2t.md`, including the machine-readable packet plan of `.theseus/spec/diagnosis-verdict.md` §5. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
