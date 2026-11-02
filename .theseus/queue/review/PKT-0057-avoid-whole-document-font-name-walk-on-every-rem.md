---
id: PKT-0057
title: Avoid whole-document font-name walk on every remote change in sdkjs word
type: refactor
priority: medium
module: sdkjs-word

origin:
  type: packet
  ref: PKT-0043

depends_on: []
requires: [documentserver, browser]

target:
  files:
    - external/sdkjs/word/Editor/Document.js
    - external/sdkjs/word/Editor/Paragraph.js
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
On the receiver of remote changes, `Document_Get_AllFontNames` (CDocument → Paragraph → ParaRun → CTextPr) runs over the whole document per applied change. Make it incremental (only the changed runs/paragraphs) or cache it, then show the gain with `profile-word.js`/`attribute-word.js` (apply on the 100 p docx) before and after.

## Essential context
PKT-0043 (baseline.md "where the word editor's CPU goes"): on the 100-page docx these functions are ≈ 9 % self of B's busy time during remote apply (182 ms Paragraph + 64 ms Document + 33 ms CTextPr per run of 30 changes); on 10 p ≈ 2–3 %. Grows with document size. Needs the P2 word QUnit oracle if available; the profile needs the native Document Server.

## Suggested plan

## Executor log
- claude-opus-5-5, 2026-11-02. **No code change made; follow-up requested.**
- Traced the per-remote-change caller: Apply_Changes -> OnStart_Load_Objects -> asc_docs_api.pre_Save (word/api.js) -> DrawingDocument.CheckFontNeeds -> CDocument.Document_Get_AllFontNames -> Paragraph -> ParaRun.Get_AllFontNames (Run.js, loop over every run item).
- Surprise: neither the call site (api.js / DrawingDocument.js) nor the run loop (Run.js) nor the list of changed objects (CollaborativeEditing; m_aChanges is cleared before pre_Save) is in target.files. From Document.js/Paragraph.js alone there is no reliable signal of which paragraphs/runs a remote change touched (run-level TextPr changes do not notify the paragraph), so any cache there risks missing fonts after a remote change, which breaks contract.preserve #1.
- Decision: do not ship an unsafe cache; record a spawn request (.theseus/spawn/PKT-0057-incremental-font-name-collection-for-remote-chan.md) with the right target and the traced call chain.
- Not done: profile before/after (no change to measure; documentserver/browser not used).
- Acceptance: bash .theseus/oracle/unit.sh -> 178 passed, 1 skipped.

## Spawned packets
- PKT-0066: Incremental font-name collection for remote changes in sdkjs word (pre_Save/CheckFontNeeds path)

## Review

## Lessons for the Atlas
