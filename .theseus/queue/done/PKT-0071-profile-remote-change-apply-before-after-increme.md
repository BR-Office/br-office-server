---
id: PKT-0071
title: Profile remote-change apply before/after incremental font collection (PKT-0066)
type: investigate
priority: medium
module: sdkjs-word

origin:
  type: packet
  ref: PKT-0066

depends_on: [PKT-0066]
requires: [documentserver, browser]

target:
  files:
    - .theseus/oracle/baseline.md
  create_in: []

context:
  cards: [sdkjs-word]
  references:
    - .theseus/oracle/baseline.md

contract:
  preserve:
    - "No sdkjs code changes; measurement only"
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
  reviewer: claude-opus-5-5-b
---

## Goal
Measure the gain of PKT-0066 (incremental font collection in asc_docs_api.pre_Save after remote changes) with profile-word.js/attribute-word.js on the 100 p docx: self time of Document_Get_AllFontNames / ParaRun.Get_AllFontNames / Paragraph during Apply_Changes, before (external/sdkjs main) and after (external/sdkjs branch pkt/PKT-0066, commit d46dde8). Record numbers in baseline.md.

## Essential context
PKT-0066 changed sdkjs only in the local git-excluded clone external/sdkjs (branch pkt/PKT-0066); the running Document Server serves the compiled upstream build, so the after build must be compiled and served (or loaded in the browser harness) to measure. Remote changes on styles/theme/numbering/drawings still fall back to the full walk, so use text/run edits for the typical case and one style edit for the fallback case.

## Suggested plan

## Executor log
- claude-opus-5-5, 2026-11-03. d46dde8 does not exist anymore; fetched `fork/pkt/PKT-0066` (b152f87, same 4 files).
- Decision: build *both* variants with `npm run build:word` (before = main 9cea536, after = main + the 4 PKT-0066 files
  checked out temporarily, then restored; sdkjs tree left clean) and inject them with Playwright routing, rather than
  comparing with the installed upstream bundle: same build path on both sides. Harness and analyser live in the
  scratchpad (create_in is empty), the recipe is in baseline.md.
- Decision: fallback case = default paragraph style font size change via the model API on A (styles class).
- Surprise: the after build never takes the incremental path. Each remote typing batch carries a `CTableId` change
  besides `ParaRun`, so `GetFontNamesFromClasses` returns null → full walk. Measured gain is 0 (differences are noise).
  Requested a follow-up (spawn) to handle CTableId.
- Surprise: the maximum achievable gain is ~4.7 ms per change (~6 % of B busy) on 100 p.
- Not done: profile-word.js/attribute-word.js were not used as-is (they cannot swap the bundle and are outside target);
  same method (CDP Profiler 100 µs, evaluate/predicate excluded) reimplemented in the scratch harness.
- unit.sh passes.

## Spawned packets
- PKT-0087: Incremental font collection: treat CTableId (new object) changes so remote typing takes the incremental path

## Review
- Approved by claude-opus-5-5-b: measurement recorded in baseline.md with root cause (CTableId fallback) and follow-up spawned; contract respected

## Lessons for the Atlas
