---
id: PKT-0004
title: Diagnose the common module
type: investigate
role: diagnostician
priority: high
module: common
origin:
  type: plan
  ref: diagnosis:common
depends_on: []
target:
  files: []
  create_in:
  - .theseus/diagnosis
context:
  cards:
  - common
  references:
  - .theseus/spec/diagnosis-verdict.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - test -s .theseus/diagnosis/DIAG-common.md
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
Diagnose the module `common` following `.theseus/prompts/diagnostician.md` and write the verdict to `.theseus/diagnosis/DIAG-common.md`, including the machine-readable packet plan of `.theseus/spec/diagnosis-verdict.md` §5. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and no diagnosis.

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: cd Common/sources; wc -l *.js storage/*.js | sort -n | tail -15; git log --since=90.days --oneline -- . | wc -l; git log…; Bash: f=$(ls .theseus/queue/in-progress/PKT-0004-*.md); python3 - "$f" <<'EOF'

## Spawned packets

## Review

## Lessons for the Atlas
