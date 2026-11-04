---
id: PKT-0129
title: Map the coedit-remote journey end to end (round 3)
type: measure
role: diagnostician
priority: critical
exclusive: true
module: project
origin:
  type: plan
  ref: journey:coedit-remote:dcb03039:r3
depends_on:
- PKT-0126
target:
  files: []
  create_in:
  - .theseus/journeys
  - .theseus/oracle
context:
  cards: []
  references:
  - .theseus/adapter/adapter.yaml
  - .theseus/oracle/baseline.md
  - .theseus/adapter/environment.md
contract:
  preserve:
  - No change to the code of the project or of its forks
  forbidden: []
allowed_commands:
- '*'
acceptance:
  commands:
  - 'grep -q "^round: 3" .theseus/journeys/coedit-remote.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/journeys/coedit-remote.md'
  - 'grep -Eq "^total_ms: [0-9]" .theseus/journeys/coedit-remote.md'
  - theseus validate
budget:
  max_files_changed: 8
  max_diff_lines: 2000
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Map the user journey `coedit-remote` (Two users in the same Word document: a change by one until it is drawn on the other's screen) end to end, as users meet it, against the integrated build: the project's main branch and the forks' collecting branches, not the installed package (which runs the original code). If `.theseus/oracle/serve-integrated.sh` does not exist, write it: it brings that build up and down on this machine. Make `bash .theseus/oracle/journeys/coedit-remote.sh` work: it runs the journey several times against the integrated build and prints one line `total_ms=<p50> min_ms=<min> max_ms=<max> runs=<n>`. Then write `.theseus/journeys/coedit-remote.md` with `goals_hash: dcb03039`, `round: 3` and `total_ms: <p50>` in its header, and a machine-readable ```yaml block: `stages:` (each with `id`, `module` (a module id of the adapter, or `project`), `files`, `functions`, `ms` and `share` in percent) and `unattributed_ms`. Break the journey down from the user's action to the last pixel: every stage the time goes through, in every module, with the files and functions that spend it (a stage above 5% of the total names its functions). The stages and `unattributed_ms` add up to `total_ms` within 5%. Round 3: compare with the earlier map if there is one.

## Essential context
- Planned by `theseus plan` from `goals.journeys` in the adapter. Every module's next diagnosis must cover every stage you give it, so name the module of each stage with the ids of `modules` in the adapter.
- `.theseus/oracle/baseline.md` and `.theseus/oracle/rounds/` hold the measurements made so far: evidence to cite, not a substitute for measuring.

## Suggested plan

## Executor log
- 2026-11-04, claude-opus-5-5. Wrote `.theseus/oracle/journeys/coedit-remote.sh` + `coedit-remote-run.cjs` (two Playwright
  contexts on the same fresh copy of open-docx-10p.docx; A presses a key, end = two rAFs after B's first OnPaint after
  Apply_Changes; absolute host clock in both frames, server split from DocService DEBUG log). `serve-integrated.sh` already existed (PKT-0126), unchanged.
- Measured on the integrated build: `total_ms=107 min_ms=72 max_ms=363 runs=60`. Map in `.theseus/journeys/coedit-remote.md`.
- Decision: per-stage p50s; their sum is 112.4, so `unattributed_ms: -5.4` (5.0%, within the rule; the means add up exactly).
- Surprise 1: Socket.IO's own message listener runs before one added later, so B's message time is read from `window.event` inside the `_onSaveChanges` wrapper; `_onSaveChanges` is also re-entered once per message (deduplicated).
- Surprise 2: `Recalculate_Page` is never called when B applies a one-letter change (fast recalc inside Apply_Changes).
- Finding: ~80% of the latency is three 40 ms timers in sdkjs-common (A send tick 31, B apply tick 17.5, B paint tick 20) plus the browser frame (17); the server is 3 ms p50.
- Not done: no packaged-build A/B run (`NO_INTEGRATED=1` supported; the 4-change smoke runs used NO_INTEGRATED=1 but the overlay was already up, so they were integrated too (111 ms)). No earlier map of this journey; compared with baseline PKT-0016/0018 instead.

## Spawned packets

## Review

## Lessons for the Atlas
