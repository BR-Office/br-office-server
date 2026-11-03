---
id: PKT-0112
title: Defer the Comments build until after document load
type: refactor
priority: high
module: web-apps-documenteditor
origin:
  type: plan
  ref: plan:web-apps-documenteditor:dcb03039:r2:P2
depends_on:
- PKT-0047
target:
  files:
  - external/web-apps/apps/common/main/lib/controller/Comments.js
  - .theseus/oracle/baseline.md
  create_in:
  - .theseus/oracle/perf
  - tests/unit
context:
  cards:
  - web-apps-documenteditor
  references:
  - .theseus/diagnosis/DIAG-web-apps-documenteditor.md
contract:
  preserve:
  - Existing tests keep passing; their assertions change only where the goal requires it, and the log says why
  forbidden: []
allowed_commands:
- '*'
requires:
- documentserver
- browser
estimated:
  files: 2
  diff_lines: 200
  source: planner
acceptance:
  commands:
  - bash .theseus/oracle/documenteditor-open.sh
  - bash .theseus/oracle/differential/web-apps-documenteditor.sh
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
rejected_reviews: 1
resume: false
---

## Goal
Move the ≈ 0.1 s of Comments onLaunch work (view/panel build) to after document load or first use, keeping comment callbacks from the sdk queued and applied. Before/after with perf/open-window.js into baseline.md.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-web-apps-documenteditor.md` (row `P2`).
PKT-0047 Comments 116/96 ms, ≈ 90-100 ms inside onLaunch. Comments.js is in apps/common, shared with other editors; the differential checks only documenteditor, so do not change behaviour for the others.

## Suggested plan

## Executor log
- return: factory stopped by the session's 2-hour limit; restarted on Theseus 0.24.0 (journeys), work kept
- return: container restarted; work kept (TEP-0010)
- attempt 3 (claude-opus-5-5): recovered the Comments.js change from the orphan commit `fork/pkt/PKT-0112` (8d9f3d2f, "work left when interrupted"); `external/web-apps` had been reset to upstream. Change unchanged: in the document editor only (`window.DE && appPrefix === 'de-'`), `view.render()` is deferred; layout methods and the members render() creates build it on first touch, `changeLayout` before the build only records the mode, and `app:ready` + setTimeout 0 builds it otherwise. Other editors are unchanged.
- Surprise (traced with a stack in `ensure`): the build no longer runs in onLaunch, but `Toolbar.onAppReady` reads `buttonAddNew` inside `Main.onDocumentContentReady` → `app:ready`, so the build runs there synchronously. The work moves; it is not removed from the open window.
- Measurement (as the review asked): ABBA, 12 + 16 pairs on two docs, paired B − A deltas, in baseline.md and perf/open-window-build-2026-11-03{b,c}.json. Pooled LoadDoc −25 ms (36/56 pairs negative, IQR −130…+56); Ready unchanged. **This does not beat the spread, so the plan's wall-clock rule is still not met.** The VM was NOT idle: PKT-0126 ran its own Chromium at the same time (load 4–5 on 2 CPUs), and I could not wait it out within this attempt.
- Decision: I did not iterate further on Comments.js. The remaining gain needs Toolbar.js (outside the target), so I spawned a request to wire the Toolbar to the add button lazily (`.theseus/spawn/PKT-0112-wire-…`). I am keeping the change because it preserves behaviour (differential PASS) and the follow-up needs it.
- Build hash 082845… (attempt 1) vs 3128cb… (now): the Comments.js content is the same as the fork version; the hash covers more than this file.
- Acceptance: documenteditor-open.sh PASS; differential web-apps-documenteditor.sh PASS (4 cases).
- block: the reviewer found an external blocker: goal needs Toolbar.js (outside target) to stop building Comments at app:ready; factory/planner must approve the spawned Toolbar packet or widen the target, then re-measure on an idle VM

## Spawned packets
- PKT-0132: Wire the Toolbar to the Comments add button lazily so the deferred Comments build leaves the open window

## Review
- Rejected by claude-opus-5-5-b: Rerun perf/open-window-build.js on an idle VM, alternating base and new builds, and put a LoadDoc before/after in baseline.md that beats the run-to-run spread (or adjust the change until it does); the current numbers show no wall-clock gain, which the plan's rule counts as not delivered.

## Lessons for the Atlas
