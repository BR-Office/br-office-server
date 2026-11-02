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
---

## Goal
Stop the whole-document font walk on every remote apply. Collect font names only from objects touched by the applied changes and load those (fonts set is only ever extended, so a superset is safe), keeping the full walk for document open. Show the gain with profile-word.js/attribute-word.js on the 100 p docx.

## Essential context
Found by PKT-0057. The walk is triggered by: CCollaborativeEditingBase.Apply_Changes -> OnStart_Load_Objects -> asc_docs_api.pre_Save (word/api.js ~8560) -> DrawingDocument.CheckFontNeeds (word/Drawing/DrawingDocument.js ~6512) -> CDocument.Document_Get_AllFontNames -> Paragraph.Document_Get_AllFontNames -> ParaRun.Get_AllFontNames (word/Editor/Run.js ~3125, loops over every run item, which is where the 'Paragraph' self time goes once inlined). The applied change list (m_aChanges, each with .Class) is cleared in Apply_OtherChanges before pre_Save runs, so the changed classes must be captured during apply (word CollaborativeEditing.js) and handed to pre_Save. PKT-0057's target (Document.js, Paragraph.js) cannot see either the call site or the changed objects, so it was not done there. Also pre_Save is called from other paths (save, images) -- keep the full walk there.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
