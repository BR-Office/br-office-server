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
  reviewer: claude-opus-5-5-b
---

## Goal
Diagnose the module `common` following `.theseus/prompts/diagnostician.md` and write the verdict to `.theseus/diagnosis/DIAG-common.md`, including the machine-readable packet plan of `.theseus/spec/diagnosis-verdict.md` §5. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and no diagnosis.

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: cd Common/sources; wc -l *.js storage/*.js | sort -n | tail -15; git log --since=90.days --oneline -- . | wc -l; git log…; Bash: f=$(ls .theseus/queue/in-progress/PKT-0004-*.md); python3 - "$f" <<'EOF'
- Verdict: refactor (JS + gradual `@ts-check`). Wave 0 = characterize tenantManager, operationContext, storage-base; wave 1 = JSDoc type-check and break the utils/operationContext cycle.
- Decision: not migrate to TypeScript yet: the uncovered parts are exactly what it would touch, and 27+ consumer files plus circular requires make a mixed build costly.
- Surprise: git history restarted (1 commit touches Common), so churn is unusable; no graph.json, coupling estimated by grep (27 consumer files).
- Not done: friction.jsonl entry not written, to stay within target.create_in (.theseus/diagnosis).

## Spawned packets

## Review
- Approved by claude-opus-5-5-b: diagnosis complete and coherent within scope and budget; only a minor score error and the friction entry, which is outside this packet's scope, need follow-up

## Lessons for the Atlas
