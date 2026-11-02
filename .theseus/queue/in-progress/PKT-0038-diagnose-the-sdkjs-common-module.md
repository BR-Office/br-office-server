---
id: PKT-0038
title: Diagnose the sdkjs-common module
type: investigate
role: diagnostician
priority: high
module: sdkjs-common
origin:
  type: plan
  ref: diagnosis:sdkjs-common:dcb03039
depends_on: []
target:
  files: []
  create_in:
  - .theseus/diagnosis
context:
  cards:
  - sdkjs-common
  references:
  - .theseus/spec/diagnosis-verdict.md
  - .theseus/oracle/baseline.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - 'grep -q "^verdict: " .theseus/diagnosis/DIAG-sdkjs-common.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/diagnosis/DIAG-sdkjs-common.md'
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
Diagnose the module `sdkjs-common` following `.theseus/prompts/diagnostician.md` and write the verdict to `.theseus/diagnosis/DIAG-sdkjs-common.md`, including the machine-readable packet plan of `.theseus/spec/diagnosis-verdict.md` §5. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.

## Suggested plan

## Executor log
- Verdict **refactor**, conditional on profiling (P1), confidence low. The baseline puts open and apply time in the client, but it doesn't split common from the editors. A language change is not supported: the oracle is `none` and there is wide global coupling.
- Surprise: `GlobalLoaders.js:184-263` loads fonts one at a time and re-checks every 50 ms (`check_loaded_list`). With 14–25 fonts per open, this is a concrete candidate for the open time. P1 records a font waterfall to measure it.
- The oracle is `none` on the card, but `external/sdkjs/tests/common` has api, charts and color-mods suites. P2 runs them.
- Not done: no profiling or test run, since that is outside this packet's scope. Line counts are from the card (wc), not from tool data. I did not read other diagnoses of sdkjs-common; I read DIAG-sdkjs-word only for its format.

## Spawned packets

## Review

## Lessons for the Atlas
