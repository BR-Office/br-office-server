---
id: PKT-0005
title: Diagnose the docservice module
type: investigate
role: diagnostician
priority: high
module: docservice
origin:
  type: plan
  ref: diagnosis:docservice
depends_on: []
target:
  files: []
  create_in:
  - .theseus/diagnosis
context:
  cards:
  - docservice
  references:
  - .theseus/spec/diagnosis-verdict.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - test -s .theseus/diagnosis/DIAG-docservice.md
budget:
  max_files_changed: 2
  max_diff_lines: 600
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Diagnose the module `docservice` following `.theseus/prompts/diagnostician.md` and write the verdict to `.theseus/diagnosis/DIAG-docservice.md`, including the machine-readable packet plan of `.theseus/spec/diagnosis-verdict.md` §5. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and no diagnosis.

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: cat .theseus/spec/diagnosis-verdict.md .theseus/atlas/docservice.md .theseus/diagnosis/SUMMARY.md; cat .theseus/adapter/…; Bash: f=$(ls .theseus/queue/in-progress/PKT-0005-*.md); python3 - "$f" <<'EOF'

## Spawned packets

## Review

## Lessons for the Atlas
