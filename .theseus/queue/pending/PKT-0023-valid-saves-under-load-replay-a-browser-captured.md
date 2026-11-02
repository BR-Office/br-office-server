---
id: PKT-0023
title: "Valid saves under load: replay a browser-captured change sequence"
type: investigate
priority: medium
module: docservice

origin:
  type: packet
  ref: PKT-0021

depends_on: [PKT-0018]

target:
  files:
    - .theseus/oracle/perf/load-coedit.js
    - .theseus/oracle/baseline.md
  create_in: []

context:
  cards: [docservice]
  references: []

contract:
  preserve:
    - "[WHAT MUST NOT CHANGE]"
  forbidden: []

acceptance:
  commands: []

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
---

## Goal
Make the load test's saves valid (callback status 2). PKT-0021 found that even 1 replayed change on a blank `new.docx` fails in x2t (`Cannot read property 'Update_OnAdd'/'Check' of undefined`, exit 86): the captured change references object ids created in the capturing browser session. Capture with Playwright the full ordered change sequence of typing K characters in a fresh docx (all saveChanges payloads from the first one), replay it in order from one sender per document, prove status 2 on 1 doc, then time save assembly (last disconnect -> callback) at 1/10/50/100/200 docs.

## Essential context

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
