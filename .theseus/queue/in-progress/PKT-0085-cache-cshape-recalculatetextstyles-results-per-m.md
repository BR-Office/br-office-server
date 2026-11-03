---
id: PKT-0085
title: Cache CShape.recalculateTextStyles results per (master, layout, placeholder, lstStyle, autofit) on pptx open
type: refactor
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0078

depends_on: [PKT-0078]

target:
  files:
    - external/sdkjs/common/Drawings/Format/Shape.js
  create_in: []

context:
  cards: [sdkjs-common]
  references:
    - .theseus/queue/in-progress/PKT-0078-cache-shape-text-styles-cshape-recalculatetextst.md
requires: [documentserver, browser]

contract:
  preserve:
    - "Text styles resolved for every shape (placeholder inheritance master -> layout -> slide, theme fonts, lstStyle, autofit fontScale/lnSpcReduction, fontRef/smartArt fill) stay identical"
    - "Existing sdkjs tests keep passing"
  forbidden: []

acceptance:
  commands:
    - "bash .theseus/oracle/sdkjs-common.sh"

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
resume: false
rejected_reviews: 1
---

## Goal
Cache CShape.recalculateTextStyles results per (master, layout, placeholder, lstStyle, autofit) on pptx open.

## Essential context
PKT-0078 measured (deck-50.pptx, native DS 9.3.7) that CShape.recalculateTextStyles (120-190 ms inclusive) is NOT an
ancestor of StyleCache/sha256: the style cache is called from ParaRun.Get_CompiledPr during paragraph recalculation.
Its cost is building CStyle/CStyles objects and Copy() of ppt levels per shape and level. A cache must key on master,
layout, placeholder type/idx, hierarchy and own lstStyle, bodyPr autofit (or tmp values when bCheckAutoFitFlag), fontRef
and smartArt fill, editor type, and be invalidated when any of these change; Get_Styles hands the object out once
(compiledStyles[level] = undefined), so check whether consumers mutate it before sharing.

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.19.1 (TEP-0006/0007/0008)
- attempt 1: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)
- attempt 2: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)
- attempt 3: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)
- Decision: module-level cache in Shape.js keyed by level, presentation/master/theme/layout Ids, placeholder type+idx, hierarchy shape Ids and autofit values (bodyPr or tmp when bCheckAutoFitFlag). Hit returns a fresh wrapper sharing the cached CStyles/lastId with shape/slide/layout/notes of the caller.
- Decision (safety over hit rate): cache only for placeholders in the presentation editor (not PDF, not GraphicFrame, not smartArt, no fontRef, no own lstStyle level) and only while History has no points (Index -1), i.e. right after open; the first history point clears and disables it. Size capped at 5000 entries.
- Checked consumer: Paragraph.Internal_CompiledParaPrPresentation only reads styles via Styles.Get_Pr (returns copies), so sharing CStyles is safe.
- Risk / not done: remote co-editing changes applied without local history points are not detected; they would need a version counter (follow-up candidate). Inputs assumed immutable while history is empty. No benchmark on deck-50.pptx was run in this attempt (oracle only); hit rate and ms saved are unmeasured.
- Acceptance: bash .theseus/oracle/sdkjs-common.sh -> 6/6 suites passed.
- Rework (R2 rejection): checked external/sdkjs on pkt/PKT-0085: `git diff --stat theseus HEAD` and `git diff fork/pkt/PKT-0085` show only common/Drawings/Format/Shape.js (+60); word/Drawing/DrawingDocument.js has no change, and the working tree is clean before and after running the oracle. The out-of-scope change seen by the previous review is not in the branch now; no code change was needed in this attempt.
- Acceptance (rework): bash .theseus/oracle/sdkjs-common.sh -> 6/6 suites passed, 10066/10323 assertions (chartEx-serialize known-broken as recorded).
- Rework 2 (R2 rejection, DrawingDocument.js again): root cause found. `git -C external/sdkjs diff --stat origin/main HEAD` lists 6 files (DrawingDocument.js, CollaborativeEditing.js, Document.js, style-cache.js, api.js, Shape.js); `diff --stat theseus HEAD` and `diff origin/theseus HEAD` list only Shape.js. The five extra files come from the already merged base (3d51031 "Merge pkt/PKT-0078"), so the scope check is diffing against origin/main instead of the packet base `theseus`. Decision: no revert. Reverting DrawingDocument.js would undo approved work from another packet and is outside the target too. Branch left as is, with Shape.js the only change. The factory/reviewer should compute R2 against `theseus` (merge-base). Recorded as friction.
- Acceptance (rework 2): bash .theseus/oracle/sdkjs-common.sh -> 6/6 suites passed, 10066/10323 assertions; external/sdkjs tree clean.
- block: 3 attempts failed; last: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)
- release: blocked by a Theseus bug (the fork checkout counted changes already merged into the collecting branch as this packet's); fixed in 0.20.0

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: cache key uses only Ids and the only switch-off is a local history point, so a co-editor with an empty History gets stale styles after a remote change (breaks contract.preserve); turn the cache off when co-editing is active or remote changes arrive, or file the version-counter follow-up in .theseus/spawn/

## Lessons for the Atlas
