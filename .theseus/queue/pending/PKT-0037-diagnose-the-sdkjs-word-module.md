---
id: PKT-0037
title: Diagnose the sdkjs-word module
type: investigate
role: diagnostician
priority: high
module: sdkjs-word
origin:
  type: plan
  ref: diagnosis:sdkjs-word:dcb03039
depends_on: []
target:
  files: []
  create_in:
  - .theseus/diagnosis
context:
  cards:
  - sdkjs-word
  references:
  - .theseus/spec/diagnosis-verdict.md
  - .theseus/oracle/baseline.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - 'grep -q "^verdict: " .theseus/diagnosis/DIAG-sdkjs-word.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/diagnosis/DIAG-sdkjs-word.md'
  - theseus validate
budget:
  max_files_changed: 3
  max_diff_lines: 700
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: null
  reviewer: null
---

## Goal
Diagnose the module `sdkjs-word` following `.theseus/prompts/diagnostician.md` and write the verdict to `.theseus/diagnosis/DIAG-sdkjs-word.md`, including the machine-readable packet plan of `.theseus/spec/diagnosis-verdict.md` §5. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
