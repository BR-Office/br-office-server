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
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
---

## Goal
Make the load test's saves valid (callback status 2). PKT-0021 found that even 1 replayed change on a blank `new.docx` fails in x2t (`Cannot read property 'Update_OnAdd'/'Check' of undefined`, exit 86): the captured change references object ids created in the capturing browser session. Capture with Playwright the full ordered change sequence of typing K characters in a fresh docx (all saveChanges payloads from the first one), replay it in order from one sender per document, prove status 2 on 1 doc, then time save assembly (last disconnect -> callback) at 1/10/50/100/200 docs.

## Essential context

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.15 (scope widened to client and converter, Rafael)
- Decision: capture and replay live in `load-coedit.js` as two modes (`capture ["text"] [out.json]`, `replay <docs> [seq.json]`),
  since `create_in` is empty. The captured "hello world" sequence (17 changes) is embedded as the default `SEQ`, so replay needs
  no external file. The old co-edit mode is unchanged.
- Decision: replay uses 1 sender per doc, fresh key on a pristine copy of the en-US blank template (`replay-base-<ts>.docx`,
  removed at the end); callbacks go to the script's own server, so the base is never overwritten.
- Surprise 1: the browser's first batch begins with a `64;` change (document/app info, version "9.3.7.0") before the first `35;`.
  PKT-0021 replayed only the `35;` change; the full sequence assembles fine (status 2).
- Surprise 2 (from the first, pre-restart attempt, whose script was lost but whose results were still in the scratchpad):
  replaying onto the capture's own file gave status 3 for all 1-200 docs, because the browser's save had already written
  the text into it. A pristine base gives status 2.
- Result: status 2 on 1/10/50/100/200 docs, 0 errors. Last save lands at about 5 s + 0.45 s x docs (95 s for 200): serial x2t
  (FileConverter `maxprocesscount` 1). Table in baseline.md.
- Checked: `capture "abc def"` then `replay 1` with that file gives status 2 as well.
- Not done: saved file content not opened to check the text (only callback status 2); `coresUsed` misses short-lived x2t
  children; no run with more converter processes. Acceptance list is empty, so the proof is the sweep above.
- Mishap: an earlier shell command with an unset variable created an empty `/cap.js` at the filesystem root; deleting it
  was refused by permissions, so it is still there (harmless, can be removed by hand).

## Spawned packets

## Review
- Approved by claude-opus-5-5-b: status 2 on 1–200 replayed docs, cause explained, save assembly timed and recorded within scope and budget

## Lessons for the Atlas
