---
id: PKT-0084
title: "sdkjs fork: land hb_get_script_horizontal_direction table (PKT-0080 patch), unit test and in-browser measurement"
type: refactor
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0080

depends_on: [PKT-0080]
requires: [documentserver, browser]

target:
  files:
    - external/sdkjs/common/libfont/common.js
    - external/sdkjs/tests/common/libfont/script-direction.js
    - external/sdkjs/tests/common/libfont/script-direction.html
  create_in: []

context:
  cards: [sdkjs-common]
  references:
    - .theseus/queue/done/PKT-0080-libfont-table-lookup-for-hb-get-script-horizonta.md
    - .theseus/oracle/baseline.md

contract:
  preserve:
    - Same direction result for every HB_SCRIPT value (table equals the switch); existing tests keep passing
  forbidden: []

acceptance:
  commands:
    - bash .theseus/oracle/sdkjs-common.sh

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
sdkjs fork: land hb_get_script_horizontal_direction table (PKT-0080 patch), unit test and in-browser measurement.

## Essential context
- PKT-0080 wrote the change in the read-only clone `external/sdkjs` (not committed anywhere); its patch is in the
  PKT-0080 Executor log. It needs an sdkjs fork / a way to carry sdkjs patches before it can land.
- Add a QUnit test comparing `AscFonts.hb_get_script_horizontal_direction` with
  `AscFonts.hb_get_script_horizontal_direction_switch` for every `AscFonts.HB_SCRIPT` value (PKT-0080 could not:
  `create_in` was empty).
- Measure in the browser: build the patched sdkjs, serve it from a mirror of the install, rerun
  `profile-fonts.js` (PKT-0072, only on branch pkt/PKT-0072, not on main when PKT-0080 ran) on large-100p.docx.

## Suggested plan

## Executor log
- Landed the PKT-0080 patch in `external/sdkjs/common/libfont/common.js` (commit on sdkjs branch pkt/PKT-0084).
  Surprise: `git apply` of the patch from the PKT-0080 log failed (whitespace of the logged diff no longer matched);
  applied the same change by hand, content identical to the logged diff.
- Unit test: `tests/common/libfont/script-direction.{html,js}` (QUnit, same harness as color-mods): table ==
  `hb_get_script_horizontal_direction_switch` for every `AscFonts.HB_SCRIPT` value (>100 checked, >20 RTL), plus
  Latin/Common/Arabic/Hebrew and non-members 0, 1, -1, 12345, 2^32-1, undefined, null. The sdkjs-common oracle picks
  it up automatically: 7/7 suites, 10341/10341 assertions (script-direction 14/14).
- Acceptance: sdkjs-common 7/7 PASS; sdkjs-word 42/42 PASS (6195 assertions); differential sdkjs-word PASS (2 cases),
  differential sdkjs-common PASS (3 cases).
- Surprise (oracle bug, outside target, not fixed): `differential/build.sh` hashes untracked files with `sha1sum`
  from the caller's cwd while `git ls-files -o` paths are relative to the sdkjs checkout, so new untracked files make
  it exit 123 (`sha1sum: tests/common/libfont/...: No such file`). Committing in external/sdkjs first avoids it.
  Requested a follow-up packet (spawn request).
- In-browser measurement (decision: did not use `profile-fonts.js`/a /var/www mirror; it is only on pkt/PKT-0072 and
  measures the installed bundle). Instead a Playwright A/B against the running Document Server (native package):
  opening large-100p.docx, routing `/sdkjs/word/sdk-all{,-min}.js` to the differential builds of base
  (ce3476f) vs this branch (02ce87d), CDP CPU profile at 200 us, window goto -> isDocumentLoadComplete, 3 runs each:
  | | fn self ms (hb_get_script_horizontal_direction) | busy ms | open ms |
  |---|---|---|---|
  | ORIG | 22.2 / 20.4 / 36.1 | 4169 / 4102 / 3869 | 6377 / 5695 / 5704 |
  | NEW  | 1.1 / 5.6 / 0.3 | 4146 / 3904 / 3546 | 5334 / 5098 / 4881 |
  The function's own cost drops ~20-35 ms -> ~0-6 ms, consistent with PKT-0080's non-TurboFan estimate.
  Caveat: the cached ORIG build is the unminified fallback (`unminified` marker, terser OOM) while NEW is minified, so
  busy/open differences mix in parse cost and are NOT attributable to this change; only the function self time is.
  The A/B script was kept in the session scratchpad (create_in empty, no place for it in target).

## Spawned packets

## Review

## Lessons for the Atlas
- An sdkjs change can be A/B-measured in the browser without a /var/www mirror: Playwright `context.route` on
  `/sdkjs/word/sdk-all(-min)?.js` serving the differential build outputs (`differential/build.sh <checkout> word`).
  Compare like with like: check the `unminified` marker of both builds.
- Commit in external/sdkjs before running the differential oracles while untracked files exist (build.sh cwd bug).
