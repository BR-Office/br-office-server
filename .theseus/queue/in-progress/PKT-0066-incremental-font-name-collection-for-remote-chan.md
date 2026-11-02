---
id: PKT-0066
title: Incremental font-name collection for remote changes in sdkjs word (pre_Save/CheckFontNeeds path)
type: refactor
priority: medium
module: sdkjs-word

origin:
  type: packet
  ref: PKT-0057

depends_on: []
requires: [documentserver, browser]

target:
  files:
    - external/sdkjs/word/api.js
    - external/sdkjs/word/Drawing/DrawingDocument.js
    - external/sdkjs/word/Editor/CollaborativeEditing.js
    - external/sdkjs/word/Editor/Run.js
    - external/sdkjs/word/Editor/Document.js
  create_in: []

context:
  cards: [sdkjs-word]
  references:
    - .theseus/oracle/baseline.md

contract:
  preserve:
    - "Fonts loaded for a document and for remote changes stay the same (no missing glyphs after a remote change)"
    - "Existing tests keep passing unchanged"
  forbidden: []

acceptance:
  commands:
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
Stop the whole-document font walk on every remote apply. Collect font names only from objects touched by the applied changes and load those (fonts set is only ever extended, so a superset is safe), keeping the full walk for document open. Show the gain with profile-word.js/attribute-word.js on the 100 p docx.

## Essential context
Found by PKT-0057. The walk is triggered by: CCollaborativeEditingBase.Apply_Changes -> OnStart_Load_Objects -> asc_docs_api.pre_Save (word/api.js ~8560) -> DrawingDocument.CheckFontNeeds (word/Drawing/DrawingDocument.js ~6512) -> CDocument.Document_Get_AllFontNames -> Paragraph.Document_Get_AllFontNames -> ParaRun.Get_AllFontNames (word/Editor/Run.js ~3125, loops over every run item, which is where the 'Paragraph' self time goes once inlined). The applied change list (m_aChanges, each with .Class) is cleared in Apply_OtherChanges before pre_Save runs, so the changed classes must be captured during apply (word CollaborativeEditing.js) and handed to pre_Save. PKT-0057's target (Document.js, Paragraph.js) cannot see either the call site or the changed objects, so it was not done there. Also pre_Save is called from other paths (save, images) -- keep the full walk there.

## Suggested plan

## Executor log
- claude-opus-5-5, 2026-11-02.
- Change (4 files, +95/-1), committed in the external clone `external/sdkjs` on local branch `pkt/PKT-0066` (commit d46dde8). `external/` is git-excluded in this repo (adapter/environment.md: read-only clones, no forks yet), so the code diff is NOT in this repo's commit; review it with `git -C external/sdkjs show pkt/PKT-0066`.
  - CollaborativeEditing.js: after Apply_OtherChanges, the classes of the applied changes are read from CoHistory between m_nRecalcIndexStart and m_nRecalcIndexEnd (m_aChanges only holds binary data, classes are resolved in Apply_Data), deduplicated by Id and kept in m_aFontCheckClasses; TakeFontCheckClasses() returns them once and clears them.
  - api.js pre_Save: if collaborative classes are pending, call DrawingDocument.CheckFontNeedsIncremental(classes); otherwise (open, save, images) or if it returns false, do the full CheckFontNeeds as before.
  - DrawingDocument.js CheckFontNeedsIncremental: extends the existing logicDocument.Fonts (never shrinks; superset is safe) with the names of the changed objects, then FontPickerByCharacter.extendFonts as in CheckFontNeeds.
  - Document.js GetFontNamesFromClasses: scans CDocumentContentElementBase (Paragraph, CTable, CBlockLevelSdt) via GetAllFontNames and ParaRun via Get_AllFontNames (includes drawings and footnote refs in the run) plus theme fonts; any other class (styles, numbering, theme, sections, drawings/shapes, ...) returns null -> full walk. Conservative whitelist so contract.preserve #1 holds.
- Decision: Run.js not changed (the walk cost goes away by not calling it on the whole document, no need to change the loop).
- Surprise: m_aChanges has no .Class (the packet context said it does); the class only exists after Apply_Data, in CoHistory.
- Acceptance: `bash .theseus/oracle/unit.sh` -> 178 passed, 1 skipped. Extra: `bash .theseus/oracle/sdkjs-word.sh` -> 42/42 suites, 6195/6195 assertions.
- Not done: the before/after profile on the 100 p docx (profile-word.js/attribute-word.js) and a browser test of a remote change; requested as a spawned follow-up (.theseus/spawn/PKT-0066-profile-*.md, requires documentserver, browser).
- block: the reviewer found an external blocker: The sdkjs code change exists only on an untracked local branch of `external/sdkjs` (`d46dde8`), and the required before/after profile can't run without serving that build. The project owner must provide a fork of sdkjs or an approved patch location so the change can be committed, reviewed and profiled.
- release: Theseus 0.18.0: sdkjs changes now go to branch pkt/PKT-0066 of BR-Office/br-office-sdkjs and are reviewed and merged there
- claude-opus-5-5, 2026-11-02 (attempt 2, after release 0.18.0).
- Surprise: the first attempt's commit d46dde8 no longer exists; branch pkt/PKT-0066 of external/sdkjs started at upstream 9cea536. Re-implemented the same design, committed as 14e4a88 on pkt/PKT-0066 (4 files, +101/-1).
- Same design as attempt 1 (CollaborativeEditing.js captures classes from CoHistory[m_nRecalcIndexStart..End], deduplicated; api.js pre_Save uses CheckFontNeedsIncremental when classes are pending; Document.js GetFontNamesFromClasses whitelists CDocumentContentElementBase and ParaRun, anything else -> null -> full walk).
- Extra guards: incremental path only when isDocumentLoadComplete and logicDocument.Fonts is already non-empty (so apply-on-open keeps the full walk); fonts already in the list are not duplicated.
- Acceptance: unit.sh 178 passed, 1 skipped. sdkjs-word.sh 42/42 suites, 6195/6195 assertions.
- Not done here: before/after profile and browser check of a remote change; that is PKT-0071 (already spawned).

## Spawned packets
- PKT-0071: Profile remote-change apply before/after incremental font collection (PKT-0066)

## Review

## Lessons for the Atlas
- Word remote apply: CoHistory holds the applied change objects (with GetClass) between m_nRecalcIndexStart/End; m_aChanges is binary only.
- Commits on external/sdkjs local branches may not survive between attempts: check `git -C external/sdkjs log` first.
