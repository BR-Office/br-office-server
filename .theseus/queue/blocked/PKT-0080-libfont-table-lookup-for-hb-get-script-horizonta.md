---
id: PKT-0080
title: "libfont: table lookup for hb_get_script_horizontal_direction / isRtlScript"
type: refactor
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0072

depends_on: [PKT-0072]
requires: [documentserver, browser]

target:
  files:
    - external/sdkjs/common/libfont/common.js
  create_in: []

context:
  cards: [sdkjs-common]
  references:
    - .theseus/oracle/baseline.md

contract:
  preserve:
    - Same direction result for every HB_SCRIPT value (table equals the switch); existing tests keep passing
  forbidden: []

acceptance:
  commands:
    - node .theseus/oracle/perf/profile-fonts.js <samples-dir> external/sdkjs 3  # hb_get_script_horizontal_direction self on large-100p.docx open

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
Replace the per-character switch with a precomputed table: libfont: table lookup for hb_get_script_horizontal_direction / isRtlScript.

## Essential context
- `AscFonts.hb_get_script_horizontal_direction` (common/libfont/common.js:291) is a `switch` over ~40
  `case BASE.HB_SCRIPT_X:` property loads; V8 cannot build a jump table, Latin text falls through every case. Called per
  character via `isRtlScript` from `CRunText.updateRtlFlag` (word) and `CTextShaper.GetDirection`.
- PKT-0072: 43 ms self on large-100p.docx open (408 k calls), 8–19 ms on the other samples and xlsx apply. Replace by a
  table indexed by script id built once (or a Set of RTL scripts). Expected gain ~40 ms on 100 p, growing with text.
- `external/` is read-only: the change needs the sdkjs fork. Add a unit test comparing table vs switch for all scripts.

## Suggested plan

## Executor log
- attempt 1: acceptance failed: `node .theseus/oracle/perf/profile-fonts.js <samples-dir> external/sdkjs 3`
- attempt 2: the spawn request PKT-0080-fix-pkt-0080-acceptance-placeholder-samples-dir.md still has template placeholders: fill in its target, contract and acceptance (rule R6)
- attempt 3: acceptance failed: `node .theseus/oracle/perf/profile-fonts.js <samples-dir> external/sdkjs 3`
- Change (in `external/sdkjs/common/libfont/common.js`): the switch is kept as a private reference function
  `hb_get_script_horizontal_direction_switch` (also exported on AscFonts, for a test); at load a `Map` of the non-LTR
  scripts is built by running the switch over every `AscFonts.HB_SCRIPT` value, so table == switch by construction.
  `hb_get_script_horizontal_direction` = fast path `LATIN`/`COMMON` -> LTR, else `Map.get`, default LTR.
- Decision: a Map, not an array: script ids are 32-bit HB tags (up to ~2^31), not small indices.
- Decision: added the LATIN/COMMON fast path after measuring: a bare `Map.get` was *slower* than the switch once
  TurboFan optimises (4.7 vs 3.0 ms / 408k calls), because the optimised switch is a chain of constant compares.
- Equivalence (node, scratch script): 166 HB_SCRIPT values + 0, 1, -1, 12345, 2^32-1, undefined, null: 0 mismatches.
- Microbench, 408k calls (86% Latin, 14% Common, 1% Arabic), best of 20, node:
  optimised switch 2.94 / table 2.06 ms; `--no-opt` 134.0 / 13.2 ms; `--jitless` 118.0 / 23.4 ms.
  The 43 ms self in PKT-0072's browser profile matches the non-TurboFan numbers, so the gain there is ~30-40 ms.
- Tests: `.theseus/oracle/sdkjs-common.sh` 6/6 suites pass (known-broken ones as recorded), 10066/10323 assertions.
- Surprise / not done: the acceptance command could not run as written: `.theseus/oracle/perf/profile-fonts.js` is not on
  this branch (PKT-0072's commit 75204fd is only on `pkt/PKT-0072`), `<samples-dir>` is a placeholder, and the
  profiler measures the installed bundle in /var/www, which this source change does not touch (needs build + mirror).
- Not done: unit test (target has no test file, `create_in` empty) and landing the change (`external/` is a read-only
  clone, no fork). Both requested in `.theseus/spawn/` together with the in-browser measurement.
- Patch (external/sdkjs, not committed elsewhere):
```diff
diff --git a/common/libfont/common.js b/common/libfont/common.js
index 07399b9..4195902 100644
--- a/common/libfont/common.js
+++ b/common/libfont/common.js
@@ -288,7 +288,9 @@
         HB_DIRECTION_BTT        : 7
     };
-    AscFonts.hb_get_script_horizontal_direction = function(script)
+    /* Reference definition (HarfBuzz hb_script_get_horizontal_direction). Not called per character:
+       it only fills the lookup table below once, so the table equals the switch for every HB_SCRIPT value. */
+    function hb_get_script_horizontal_direction_switch(script)
     {
         let BASE = AscFonts.HB_SCRIPT;
         /* https://docs.google.com/spreadsheets/d/1Y90M0Ie3MUJ6UVCRDOypOtijlMDLNNyyLk36T6iMu0o */
@@ -372,7 +374,33 @@
         }
         return AscFonts.HB_DIRECTION.HB_DIRECTION_LTR;
+    }
+
+    /* Precomputed script -> direction table, only non-LTR scripts are stored (LTR is the default of the switch,
+       including for values that are not HB_SCRIPT members). Replaces a ~45-case switch evaluated per character. */
+    const hb_script_direction_table = new Map();
+    for (let name in AscFonts.HB_SCRIPT)
+    {
+        let script = AscFonts.HB_SCRIPT[name];
+        let dir = hb_get_script_horizontal_direction_switch(script);
+        if (dir !== AscFonts.HB_DIRECTION.HB_DIRECTION_LTR)
+            hb_script_direction_table.set(script, dir);
+    }
+    const HB_DIRECTION_LTR_VALUE = AscFonts.HB_DIRECTION.HB_DIRECTION_LTR;
+
+    const HB_SCRIPT_LATIN_VALUE  = AscFonts.HB_SCRIPT.HB_SCRIPT_LATIN;
+    const HB_SCRIPT_COMMON_VALUE = AscFonts.HB_SCRIPT.HB_SCRIPT_COMMON;
+
+    AscFonts.hb_get_script_horizontal_direction = function(script)
+    {
+        // Fast path for the overwhelmingly common scripts (both LTR, as in the switch)
+        if (script === HB_SCRIPT_LATIN_VALUE || script === HB_SCRIPT_COMMON_VALUE)
+            return HB_DIRECTION_LTR_VALUE;
+
+        let dir = hb_script_direction_table.get(script);
+        return undefined === dir ? HB_DIRECTION_LTR_VALUE : dir;
     };
+    AscFonts.hb_get_script_horizontal_direction_switch = hb_get_script_horizontal_direction_switch;
 	const BASE = AscFonts.HB_SCRIPT;
```
- Attempt 2 (after rejection "sh: cannot open samples-dir"): ran the acceptance exactly as written; it fails in the
  shell before node starts (`/bin/bash: samples-dir: No such file or directory`, exit 1): `<samples-dir>` is a literal
  placeholder parsed as stdin redirection, and `profile-fonts.js` is still absent from this branch. Passing it would
  need a file outside target (a `samples-dir` file at repo root, the script itself), which the rules forbid; so not done.
  Decision: no code change this attempt (the patch above stands); requested a packet to fix the acceptance
  (`.theseus/spawn/PKT-0080-fix-pkt-0080-acceptance-placeholder-samples-dir.md`).
- Attempt 3: acceptance rerun exactly as written, same shell failure (`samples-dir: No such file`, exit 1),
  `profile-fonts.js` still absent from this branch. Not passable within target.files; no code change.
  Fixed the second rejection reason: filled target (this packet file, create_in .theseus/oracle/perf/),
  contract and acceptance of the spawn request `PKT-0080-fix-pkt-0080-acceptance-placeholder-samples-dir.md`.
  This is the last attempt (max_attempts 3): the packet should be blocked on that spawn request.
- block: 3 attempts failed; last: acceptance failed: `node .theseus/oracle/perf/profile-fonts.js <samples-dir> external/sdkjs 3`. Output:
```
sh: 1: cannot open samples-dir: No such file
```

## Spawned packets
- PKT-0083: Fix PKT-0080 acceptance: placeholder samples-dir and missing profile-fonts.js
- PKT-0084: sdkjs fork: land hb_get_script_horizontal_direction table (PKT-0080 patch), unit test and in-browser measurement

## Review

## Lessons for the Atlas
