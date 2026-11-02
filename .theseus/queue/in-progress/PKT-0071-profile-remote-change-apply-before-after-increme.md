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
  reviewer: null
---

## Goal
Measure the gain of PKT-0066 (incremental font collection in asc_docs_api.pre_Save after remote changes) with profile-word.js/attribute-word.js on the 100 p docx: self time of Document_Get_AllFontNames / ParaRun.Get_AllFontNames / Paragraph during Apply_Changes, before (external/sdkjs main) and after (external/sdkjs branch pkt/PKT-0066, commit d46dde8). Record numbers in baseline.md.

## Essential context
PKT-0066 changed sdkjs only in the local git-excluded clone external/sdkjs (branch pkt/PKT-0066); the running Document Server serves the compiled upstream build, so the after build must be compiled and served (or loaded in the browser harness) to measure. Remote changes on styles/theme/numbering/drawings still fall back to the full walk, so use text/run edits for the typical case and one style edit for the fallback case.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
