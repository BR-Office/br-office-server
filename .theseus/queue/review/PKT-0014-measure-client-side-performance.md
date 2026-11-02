---
id: PKT-0014
title: Measure client-side performance
type: investigate
priority: high
module: project

origin:
  type: packet
  ref: PKT-0013

depends_on: []

target:
  files:
    - .theseus/oracle/baseline.md
  create_in:
    - .theseus/oracle/perf

context:
  cards: []
  references:
    - .theseus/oracle/baseline.md

contract:
  preserve:
    - No change to the project's source code
  forbidden: []

acceptance:
  commands:
    - test -s .theseus/oracle/baseline.md

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
Measure where users feel the client: time to open and render a document, time to apply remote co-edit changes, typing latency, memory, in the browser editors. Record the numbers in `.theseus/oracle/baseline.md`.

## Essential context
The client lives outside this repository (sdkjs and web-apps of Euro-Office / ONLYOFFICE). PKT-0013 could not measure it. This needs access to the client repositories and a browser (e.g. Playwright with performance marks), so the factory must decide whether to add those repositories to the pilot.

## Suggested plan
1. Get the client repos; 2. script open + co-edit with Playwright against a running server; 3. record scripts in `.theseus/oracle/perf/`.

## Executor log
- return: factory paused: measuring needs a decision on which repositories and environment join the pilot
- attempt 1: the executor's permissions refused: Bash: mkdir -p /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0014/0204548c-a824-57b7-bea3-1783011bc81a/s…; Bash: cd /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0014/0204548c-a824-57b7-bea3-1783011bc81a/scratch…; Bash: f=.theseus/spawn/PKT-0014-break-down-client-open-and-co-edit-latency-on-re.md
- attempt 2 (claude-opus-5-5, 2026-11-02): the environment now has the Docker image plus Playwright, so the client repos were not needed: the image ships the compiled sdkjs/web-apps 9.3.7. Wrote `.theseus/oracle/perf/client-perf.js` and recorded the results in `baseline.md` ("Client (browser editors)" section).
  - Decisions: measured against the built client through the example page (new docx), with no checkout of sdkjs. Readiness = `editor.isDocumentLoadComplete`. Typing = key press → char in the model → next rAF. Remote = text present in B's model, in two Playwright contexts. Memory = `performance.memory` in the editor iframe. 5 runs × (20 keys + 5 remote edits).
  - Surprise: with the documented `docker run`, the document never loads. The SSRF guard refuses the download from the example on localhost (`DNS lookup 127.0.0.1 ... localhost` in converter/out.log), and the only client symptom is an editor with no logic document. Fix: `-e ALLOW_PRIVATE_IP_ADDRESS=true` (plus `EXAMPLE_ENABLED=true`). `.theseus/adapter/environment.md` should say this, but it is outside my target.
  - Not done: a breakdown of open time and of the remote-apply tail, large/realistic documents, xlsx/pptx. Requested in the spawn below. The friction line is not appended, because `.theseus/scoreboard/friction.jsonl` is outside target.files. Its content: environment.md (adapter) is missing the ALLOW_PRIVATE_IP_ADDRESS flag, and it helped a lot that it named Playwright and the image.

## Spawned packets
- PKT-0016: Break down client open and co-edit latency on realistic documents

## Review

## Lessons for the Atlas
