---
id: PKT-0090
title: Repair sdkjs color-mods and chartEx-serialize test pages so they join the common oracle
type: characterize
priority: low
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0058

depends_on: []
requires: [browser]

target:
  files:
    - external/sdkjs/tests/common/color-mods/color-mods.js
    - external/sdkjs/tests/common/charts/chartEx-serialize.html
    - external/sdkjs/tests/common/charts/chartEx-serialize.js
    - .theseus/oracle/sdkjs-common-run.cjs
    - .theseus/atlas/sdkjs-common.md
  create_in: []

context:
  cards: [sdkjs-common]
  references: []

contract:
  preserve:
    - "The four upstream common/api suites keep passing"
    - "No change to sdkjs product code (only the test pages and the oracle)"
  forbidden: []

acceptance:
  commands:
    - .theseus/oracle/sdkjs-common.sh

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
resume: false
rejected_reviews: 2
---

## Goal
PKT-0058 found both suites fail from test bugs, not product defects. Repair the test pages and remove their entries from `known` in `.theseus/oracle/sdkjs-common-run.cjs` when they go green (or record precisely what stays red):
- color-mods: 257 assertions fail by ±1 on one 0-255 channel (float vs Office fixed-point rounding). Compare with a ±1 tolerance on R, G, B and A (the file's `IS_APPROX_EQUALS` switch covers RGB only).
- chartEx-serialize: the page loads no `common/AllFonts.js`, so `new asc_docs_api` throws before `QUnit.start()` (hang). Define `g_fonts_selection_bin = ""` (or load a fonts stub), load only the scripts it needs (cell+slide+word together redeclare globals), and decide what to do with "Compare 1xml": `CChartSpace` has no `fromXml`/`toXml`, so the test needs a serializer that is not in this codebase — mark it `QUnit.test.skip` with that reason rather than implement it.

## Essential context
- Diagnosis and stacks: `.theseus/atlas/sdkjs-common.md` (color-mods and chartEx rows) and the comment above `known` in `sdkjs-common-run.cjs`.
- Reproduce one suite: `.theseus/oracle/sdkjs-common.sh color-mods` (or `charts`).

## Suggested plan

## Executor log
- attempt 1: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)
- attempt 2: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)
- attempt 3: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)
- color-mods: replaced the `IS_APPROX_EQUALS` switch (RGB only, one assertion per channel) by one assertion per case with a ±1 tolerance on R, G, B and A, so the total stays 10023; the message prints got/expected. Result 10023/10023.
- chartEx-serialize.html: removed cell and word scripts (slide alone carries `AscFormat.CChartSpace`), added `var g_fonts_selection_bin = ""` before the sdk scripts. `asc_docs_api` now constructs and QUnit starts.
- Surprise: `CChartSpace` *does* answer `fromXml`/`toXml`, but they are the generic `CBaseNoIdObject` stubs; `toXml` throws in `CMemory.WriteXmlString` (undefined name). A feature check on the methods is therefore wrong; "Compare 1xml" is skipped unconditionally with the reason in the code and the test name.
- Decision: since a suite with only a skipped test is 0/0 (vacuous green), added a "Page boots" test (api, `CChartSpace` defined, sample file loaded): 3/3.
- `known` in `sdkjs-common-run.cjs` is now empty (mechanism kept for future cases). Full oracle: 6/6 suites, 10326/10326, ~14 s (was ~130 s because of the chartEx timeout).
- Not done: the header comment of `.theseus/oracle/sdkjs-common.sh` still says color-mods/chartEx are known broken; that file is outside the target, so I left it (one-line comment fix for a later packet touching the oracle).
- Attempt after R2 rejection (DrawingDocument.js): checked `git -C external/sdkjs diff --stat theseus HEAD` and `status`: only the 3 target test files differ, working tree clean, fork branch equals HEAD; the oracle run leaves no product-code change behind. No product file is touched in this attempt.
- Attempt 3, root cause of the R2 rejections: `git -C external/sdkjs diff --stat origin/main HEAD` lists `word/Drawing/DrawingDocument.js` (+27) and 4 other word files, all from commit 3d51031 "Merge pkt/PKT-0078 (Theseus)", which is already on the `theseus` base branch (theseus == origin/theseus == 3d51031 == merge-base of HEAD). Against `theseus`, this branch changes only the 3 target test files. The scope check seems to diff against `origin/main` instead of the packet's base branch `theseus`; that cannot be fixed inside this target (no rebase/history rewrite of other branches allowed). Spawned a factory follow-up asking the scope check to use the merge-base with `theseus`. Oracle rerun: 6/6, 10326/10326.
- block: 3 attempts failed; last: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)
- release: blocked by a Theseus bug (the fork checkout counted changes already merged into the collecting branch as this packet's); fixed in 0.20.0
- fork: pkt/PKT-0090 merged into theseus of https://github.com/BR-Office/br-office-sdkjs (e32ad16)
- Attempt after release (0.20.0): the sdkjs branch was back at 3d51031 and the oracle edit was gone, so all changes were redone from this log: color-mods ±1 on R,G,B,A in one assertion per case (10023/10023); chartEx html loads slide scripts only plus `g_fonts_selection_bin = ""`; "Page boots" test + "Compare 1xml" skipped with reason (3/3); `known = {}`; card rows updated. Oracle: 6/6, 10326/10326, 16 s. `git -C external/sdkjs status` shows only the 3 target files after the run.
- Still not done: header comment of `.theseus/oracle/sdkjs-common.sh` (outside target) still calls the two suites known-broken. The earlier spawn request file is not in `.theseus/spawn/` any more; the R2 bug was fixed in 0.20.0, so not re-filed.
- Attempt after review rejection: "Page boots" now also pins the surprise with `assert.throws` on the same toXml path the skipped test uses (XmlWriterContext + `OpenXmlPackage.getXmlBytes` on a `new CChartSpace(api)`). A bare `toXml(new CMemory(), name)` does NOT throw (the generic stub writes an empty node), so the throw is specific to the getXmlBytes/writer-context path; comment updated accordingly. Suite 4/4.
- Filed the follow-up for the stale header comment of `.theseus/oracle/sdkjs-common.sh` in `.theseus/spawn/` (requires: [browser]).
- Attempt after 2nd review rejection: fixed the stale skip comment (throw only via getXmlBytes, bare toXml does not throw), reworded the `assert.throws` message, added a matcher (`err instanceof TypeError`, verified green). Atlas chartEx row now 4/4 with the getXmlBytes-only throw, total 10327/10327 (~19 s). Oracle: 6/6, 10327/10327.

## Spawned packets
- (not queued, unfinished request: PKT-0090-scope-check-r2-for-external-sdkjs-must-diff-agai.md)
- PKT-0092: Update stale header comment of sdkjs-common.sh oracle (color-mods/chartEx no longer known broken)

## Review
- Rejected by claude-opus-5-5-b: add a test that pins the surprise (CChartSpace toXml stub throws, e.g. an assert.throws in "Page boots") and file a follow-up for the stale header comment in .theseus/oracle/sdkjs-common.sh in .theseus/spawn/
- Rejected by claude-opus-5-5-b: fix the stale "toXml throws" comment on the skipped test and the assert.throws message (the throw only happens via getXmlBytes), update the Atlas chartEx row (4/4, getXmlBytes-only throw) and total (10327), and add an error matcher to assert.throws

## Lessons for the Atlas
