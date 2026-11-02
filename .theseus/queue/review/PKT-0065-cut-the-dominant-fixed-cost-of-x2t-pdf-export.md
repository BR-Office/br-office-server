---
id: PKT-0065
title: Cut the dominant fixed cost of x2t PDF export
type: refactor
priority: medium
module: x2t
origin:
  type: plan
  ref: plan:x2t:dcb03039:P3
depends_on:
- PKT-0041
- PKT-0042
target:
  files: []
  create_in:
  - .theseus/diagnosis
context:
  cards:
  - x2t
  references:
  - .theseus/diagnosis/DIAG-x2t.md
contract:
  preserve:
  - Existing tests keep passing unchanged
  forbidden: []
acceptance:
  commands:
  - .theseus/oracle/unit.sh
  - npm run lint:check
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
rejected_reviews: 2
---

## Goal
Using P1's split, propose and (once a writable fork of Euro-Office/core exists) implement the in-place change that removes the dominant per-process cost of PDF export, proven equal by P2's corpus oracle and faster by convert-large.js.

## Essential context
- Wave 1 of the plan in `.theseus/diagnosis/DIAG-x2t.md` (row `P3`).
external/core is a read-only checkout until forks exist; if still so, deliver the change as a patch and a decision note for humans. Candidates - V8 snapshots/JS cache, skipping CDocBuilder::Initialize where not needed, a persistent converter.

## Suggested plan

## Executor log
- attempt 2: acceptance failed: `.theseus/oracle/unit.sh`
- return: factory restarted on Theseus 0.16.3
- return: factory restarted on Theseus 0.16.4
- attempt 3 (claude-opus-5-5): no core fork exists, so no core patch. Found that x2t 9.3.7-1 already supports V8 startup snapshots (`createJSSnapshots`, loads `sdkjs/<editor>/sdk-all.bin`); the .bin files on the VM were left by an earlier attempt. Decision: the in-place change is a deployment step, not a code change; previous patch approach dropped (its hunk was malformed and it is not needed).
- Proof of speed: convert-large.js (5 runs, new.{docx,xlsx,pptx}) with vs without sdk-all.bin: service→pdf p50 −88/−101/−106 ms (−10…14 %); raw JSON in .theseus/diagnosis/PKT-0065-convert-large-*.json. Snapshots restored afterwards.
- Proof of equality: corpus.py (templates + make-corpus) diff vs baseline-9.3.7-1.json = equal.
- Surprise: gain ≈ 0.1 s, below the plan's 0.3–0.6 s; the rest is first-Execute JS warm-up, only removable by a persistent renderer (deferred, needs core fork).
- Surprise: unit.sh failed once in docsCoServerCrashPaths (io.use handshake auth), then passed 3/3 full runs: flaky, likely what failed attempt 2. Not in target, not touched.
- Not done: packaging change (postinst/Docker) — requested as spawn `.theseus/spawn/PKT-0065-ship-v8-js-startup-snapshots-*.md`. Persistent doctrenderer not requested yet (needs core fork first).

## Spawned packets
- PKT-0075: Ship V8 JS startup snapshots (sdk-all.bin) with the Document Server install

## Review
- Rejected by claude-opus-5-5-b: patch hunk header is wrong (`@@ -53,6 +53,12 @@` should be `@@ -53,7 +53,13 @@`), so the patch is malformed; fix it, dry-run it against the installed script and log the result
- Rejected by claude-opus-5-5-b: Goal requires proof of speedup via convert-large.js; not run (start DS services and record before/after numbers, or spawn a tracked follow-up with a documented reason)

## Lessons for the Atlas
