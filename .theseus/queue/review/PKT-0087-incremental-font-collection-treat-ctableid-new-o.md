---
id: PKT-0087
title: "Incremental font collection: treat CTableId (new object) changes so remote typing takes the incremental path"
type: refactor
priority: medium
module: sdkjs-word

origin:
  type: packet
  ref: PKT-0071

depends_on: [PKT-0066]
requires: [documentserver, browser]

target:
  files:
    - external/sdkjs/word/Editor/CollaborativeEditing.js
    - external/sdkjs/word/Editor/Document.js
  create_in: []

context:
  cards: [sdkjs-word]
  references:
    - .theseus/oracle/baseline.md

contract:
  preserve:
    - "Font set after a remote change is a superset of what the full walk collects"
    - "Open, save and image paths keep the full walk"
  forbidden: []

acceptance:
  commands:
    - "bash .theseus/oracle/sdkjs-word.sh"
    - "bash .theseus/oracle/unit.sh"

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: null
resume: false
---

## Goal
Incremental font collection: treat CTableId (new object) changes so remote typing takes the incremental path.

## Essential context
PKT-0071 measured PKT-0066 (fork branch pkt/PKT-0066, b152f87) and found it never takes the incremental path for remote typing:
every incoming batch on B holds a `CTableId` change (registration of the new ParaRun) next to the `ParaRun` change, so
`CDocument.GetFontNamesFromClasses` returns null and `pre_Save` falls back to `CheckFontNeeds` (full walk), 30/30 batches.
Fix: in `private_CollectFontCheckClasses` (or `GetFontNamesFromClasses`) skip `CTableId` classes, or replace them by the
object they register (change.Class is g_oTableId; the added object is in the change data), keeping `null` → full walk
for anything else unknown. Also check that `Paragraph` is accepted (instanceof CDocumentContentElementBase).
Then re-measure with the A/B recipe in baseline.md section "PKT-0066 A/B (PKT-0071)": expected gain ≈ 140 ms self per 30
remote changes on the 100 p docx (≈ 4.7 ms per change, ≈ 6 % of B's busy time).

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.19.1 (TEP-0006/0007/0008)
- attempt 1: changed external/sdkjs/.theseus-addons/sdkjs-forms, outside the target (rule R2)
- attempt 2: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)
- fork: could not push pkt/PKT-0087 to https://github.com/BR-Office/br-office-sdkjs: git push -q fork pkt/PKT-0087:refs/heads/pkt/PKT-0087 failed: To https://github.com/BR-Office/br-office-sdkjs
 ! [rejected]        pkt/PKT-0087 -> pkt/PKT-0087 (non-fast-forward)
error: failed to push some refs to 'https://github.com/BR-Office/br-office-sdkjs'
hint: Updates were rejected because the tip of your current branch is behind
hint: its remote counterpart. If you want to integrate the remote changes,
hint: use 'git pull' before pushing again.
hint: See the 'Note about fast-forwards' in 'git push --help' for details.
- attempt 3: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)
- Decision: in `private_CollectFontCheckClasses`, a change of type `historyitem_TableId_Add` is replaced by the object it registers (`NewClass`, else `g_oTableId.Get_ById(Id)`); if neither resolves, `null` is pushed (full walk). Unknown registered objects (not run / content element) still make `GetFontNamesFromClasses` return null → full walk, so the superset contract holds.
- Checked: `Paragraph` inherits `CDocumentContentElementBase` (Paragraph.js:175) and has `GetAllFontNames`, so it is accepted; Document.js needed no change.
- Acceptance: sdkjs-word 42/42 suites, 6195 assertions; unit 178 passed, 1 skipped.
- Not done: the A/B re-measurement in the browser (baseline.md "PKT-0066 A/B (PKT-0071)"); requested as a spawned packet so baseline.md is updated in its own scope.
- Attempt 2 (rejection R2): the factory's auto-commit 2aeb92c in external/sdkjs had added a gitlink `.theseus-addons/sdkjs-forms` (an addon checkout dropped into the tree). Removed it from the index with `git rm --cached` in a new commit and added `.theseus-addons/` to the sdkjs local `info/exclude` so it is not re-committed. Branch diff vs base 3d51031 is now only word/Editor/CollaborativeEditing.js. Acceptance re-run: sdkjs-word 42/42 (6195), unit pass.
- Surprise: the factory's "commit what you leave" step picks up untracked setup dirs in external/sdkjs; this is an environment issue, not a code issue.
- Attempt 3 (rejection R2 on .theseus-addons/sdkjs-forms and word/Drawing/DrawingDocument.js): the add-then-remove commits still showed the addon path in the branch history. Squashed the sdkjs branch to one commit on base 3d51031 (`git reset --soft` + recommit, local only, no push); `git diff --stat 3d51031 HEAD` and every commit now touch only word/Editor/CollaborativeEditing.js. DrawingDocument.js is not in the branch diff nor modified in the tree after acceptance runs; it most likely came from an earlier factory auto-commit that is now gone.
- Acceptance re-run: sdkjs-word 42/42 suites, 6195/6195 assertions; unit pass; working tree of external/sdkjs clean afterwards.
- block: 3 attempts failed; last: changed external/sdkjs/word/Drawing/DrawingDocument.js, outside the target (rule R2)
- release: blocked by a Theseus bug (the fork checkout counted changes already merged into the collecting branch as this packet's); fixed in 0.20.0
- attempt 1: changed external/sdkjs/.theseus-addons/sdkjs-forms, outside the target (rule R2)
- fork: pkt/PKT-0087 merged into theseus of https://github.com/BR-Office/br-office-sdkjs (967ac51)
- Attempt 4 (after release on 0.20.0): the sdkjs branch was back at base 3d51031, so the change was re-applied: in `private_CollectFontCheckClasses`, a `historyitem_TableId_Add` change is replaced by its `NewClass` (else `g_oTableId.Get_ById(Id)`), else null → full walk. Document.js unchanged (Paragraph already accepted via CDocumentContentElementBase). Single commit in external/sdkjs touching only CollaborativeEditing.js. A/B re-measure stays with PKT-0089 (already spawned).
- Attempt 5 (rejection R2 on .theseus-addons/sdkjs-forms): the factory auto-commit e456c77 re-added the addon gitlink. Dropped it with `git reset --soft e5fd187` + unstaging, and added `/.theseus-addons/` to sdkjs `info/exclude` so the dir stays untracked and ignored. Branch diff vs 3d51031 is only word/Editor/CollaborativeEditing.js; sdkjs tree clean. Acceptance re-run: sdkjs-word 42/42 (6195/6195); unit pass (exit 0).
- Surprise: the factory should exclude `.theseus-addons/` in fork checkouts itself; the local exclude is a workaround (previous exclude was lost with the re-checkout).

## Spawned packets
- PKT-0089: Re-measure PKT-0066 A/B after PKT-0087 (CTableId handled)

## Review

## Lessons for the Atlas
