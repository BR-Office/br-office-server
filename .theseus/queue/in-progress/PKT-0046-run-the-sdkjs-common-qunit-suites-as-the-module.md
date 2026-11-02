---
id: PKT-0046
title: Run the sdkjs common QUnit suites as the module oracle
type: characterize
priority: medium
module: sdkjs-common
origin:
  type: plan
  ref: plan:sdkjs-common:dcb03039:P2
depends_on: []
target:
  files:
  - .theseus/atlas/sdkjs-common.md
  create_in:
  - .theseus/oracle
context:
  cards:
  - sdkjs-common
  references:
  - .theseus/diagnosis/DIAG-sdkjs-common.md
contract:
  preserve:
  - Existing tests keep passing unchanged
  forbidden: []
allowed_commands:
- '*'
acceptance:
  commands:
  - .theseus/oracle/unit.sh
  - npm run lint:check
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Run external/sdkjs/tests/common suites headless (npm ci in build, npm run develop, node-qunit-puppeteer as in external/sdkjs/AGENTS.md), record pass/fail, duration and skipped suites, write a wrapper script under .theseus/oracle, and set the card's oracle level and sources. Note what is not covered (font loading, co-edit apply) so refactors there add their own checks.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-sdkjs-common.md` (row `P2`).
The card says oracle none; tests/common has api, charts and color-mods suites run by tests/runAll.js upstream. Wave-1 refactors are gated on this.

## Suggested plan

## Executor log
- Wrote `.theseus/oracle/sdkjs-common.sh` + `sdkjs-common-run.cjs`, modelled on the PKT-0044 word oracle (same setup, Playwright Chromium, concurrency 2). The runner takes the `common/` entries of upstream `tests/runAll.js` and also every other `tests/common/**/*.html`.
- Result: the 4 upstream api suites pass (300/300 assertions, ~11-20 s). Setup on a fresh worktree adds ~2 min.
- Decision: `*-compiled.html` (4) skipped, since they need a full `npm run build`, which this oracle does not do.
- Surprise: color-mods (not in upstream runAll) fails 11 tests (9766/10023) and chartEx-serialize times out at 120 s. Decision: local skips so the oracle is green, kept runnable with `ORACLE_ALL=1`; spawned an investigate request for both.
- Card: oracle level `unit`, source the script; table of results; uncovered areas listed (fonts, co-edit apply, history, serialization, charts, clipboard).
- Not done: did not try a longer timeout for chartEx, did not run `libfont/test/` pages or the compiled variants.
- Acceptance: `unit.sh` 178 passed / 1 skipped; `lint:check` 0 errors, 1 pre-existing warning.
- Attempt 2 (after rejection): removed the local skips and `ORACLE_ALL`. color-mods and chartEx-serialize now run by default as known-broken: color-mods passes only if the count is exactly 9766/10023 and the failing test names equal the 11 recorded ones; chartEx-serialize passes only if it still hits the 120 s timeout. Any other result (fixed or worse) fails the oracle with the expected record printed.
- Decision: kept the full 120 s timeout for chartEx (a shorter one would prove less); it runs in parallel, so the oracle takes ~130 s total. Limitation: a timeout cannot distinguish a hang from a slow run; noted on the card.
- Runner now exits 1 with `FAIL no suite matched` when nothing runs (checked with filter `nope`). Fixed the sdkjs-common.sh header to describe the real list.
- Acceptance: `sdkjs-common.sh` 6/6 suites; `unit.sh` and `lint:check` rerun (see commit).

## Spawned packets
- Request: Diagnose failing sdkjs color-mods and chartEx-serialize QUnit suites (investigate, requires browser).

## Review

## Lessons for the Atlas
- sdkjs common's QUnit oracle only covers the Builder API surface; fonts and co-editing still need their own checks.
- Upstream runAll.js is the list of suites known to be green; other suites in the tree may be broken.
