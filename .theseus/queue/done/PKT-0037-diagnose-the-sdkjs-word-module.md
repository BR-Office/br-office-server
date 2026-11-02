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
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
---

## Goal
Diagnose the module `sdkjs-word` following `.theseus/prompts/diagnostician.md` and write the verdict to `.theseus/diagnosis/DIAG-sdkjs-word.md`, including the machine-readable packet plan of `.theseus/spec/diagnosis-verdict.md` §5. List your model id in `diagnosed_by`.

## Essential context
- Planned by `theseus plan`: the module has an Atlas card and the performance baseline exists, and there is no diagnosis for the current goals.
- The goal is `goals.statement` in the adapter; judge every verdict by what it delivers toward it, using `.theseus/oracle/baseline.md`.
- Set `goals_hash: dcb03039` in the header: it records which goals this diagnosis answers.

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: cd external/sdkjs; ls tests/word | head -30; ls tests/word | wc -l; cat tests/runAll.js | head -30; git log --oneline -1…; Bash: S=external/sdkjs; ls $S/tests/word | head -30; ls $S/tests/word | wc -l; head -30 $S/tests/runAll.js; find $S/word -name…; Bash: find external/sdkjs/word -name '*.js' -exec cat {} + | wc -l; Bash: sed -i 's/requires: \[documentserver\]/requires: [documentserver, browser]/' .theseus/diagnosis/DIAG-sdkjs-word.md
- Verdict **refactor**, conditional on P1 (profile open / remote apply). Reason: the baseline puts ~1.9–2.4 s of every docx open after Editor.bin, the co-edit apply tail and typing p90 > 100 ms in the client, plausibly much of it in this module; no profile yet splits it from sdkjs/common, fonts or the browser.
- Migrate/rewrite discarded: oracle not established (D1), hotspot unknown, model tightly coupled to sdkjs/common globals (a WASM boundary would copy per edit).
- Surprise: the card says oracle `none`, but `external/sdkjs/tests/word/` holds 21 QUnit suites run headless by `tests/runAll.js` in upstream CI. Planned P2 to make them the oracle and update the card.
- Could not do: line counts via `find -exec`/pipelines were refused by permissions; used the card's ~428k figure. Did not run the QUnit suites (out of scope for a diagnosis).
- Did not read any other sdkjs-word diagnosis (independence); read DIAG-common only for the format.

## Spawned packets

## Review
- Approved by claude-opus-5-5-b: The verdict and its evidence check out against the baseline and the 21 existing test suites, and the packet plan is valid; one minor p50 typo (47 should be 42).

## Lessons for the Atlas
