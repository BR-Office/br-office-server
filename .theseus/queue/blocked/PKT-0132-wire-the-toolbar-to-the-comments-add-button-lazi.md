---
id: PKT-0132
title: Wire the Toolbar to the Comments add button lazily so the deferred Comments build leaves the open window
type: refactor
priority: high
exclusive: true
module: web-apps-documenteditor

origin:
  type: packet
  ref: PKT-0112

depends_on: [PKT-0112]

target:
  files:
    - external/web-apps/apps/documenteditor/main/app/controller/Toolbar.js
    - external/web-apps/apps/common/main/lib/controller/Comments.js
    - .theseus/oracle/baseline.md
  create_in:
    - .theseus/oracle/perf

context:
  cards: [web-apps-documenteditor]
  references:
    - .theseus/diagnosis/DIAG-web-apps-documenteditor.md

contract:
  preserve:
    - "Comments panel, Add-comment toolbar button locks and sdk comment callbacks behave as before (differential oracle passes)"
  forbidden: []

acceptance:
  commands:
    - "bash .theseus/oracle/documenteditor-open.sh"
    - "bash .theseus/oracle/differential/web-apps-documenteditor.sh"

requires: [documentserver, browser]

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
rejected_reviews: 3
resume: false
---

## Goal
PKT-0112 defers the Comments view build (`view.render()`) out of `onLaunch` in the document editor. But `Toolbar.onAppReady`
(Toolbar.js ≈ l. 4076) reads `comments.getView().buttonAddNew` inside `Main.onDocumentContentReady` → `app:ready`, which forces
the build synchronously there. Make the Toolbar register `buttonAddNew` (locks, `btnsComment.add`) when the Comments view is
actually built, e.g. on a notification Comments.js triggers after its deferred render, so the build runs after
`isDocumentLoadComplete` (idle callback or first use). Measure LoadDoc/Ready before/after with
`.theseus/oracle/perf/open-window-build.js` on an idle VM, as paired deltas (B − A per iteration), and write them to baseline.md.

## Essential context
- baseline.md section "Comments build deferred in the document editor, A/B (PKT-0112)": a pooled −25 ms LoadDoc, Ready unchanged, with the mechanism.
- Comments.js is shared with other editors: keep the change gated to the document editor (`appPrefix === 'de-'`).

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.24.2 (quiet journey measurement)
- attempt 2 (claude-opus-5-5): the main-repo work of attempt 1 was not on this branch and `external/web-apps` was at upstream; recovered the Comments.js deferral (PKT-0112) and both Toolbar commits from `fork/pkt/PKT-0132` by cherry-pick, and `perf/open-window-build.js` from `d926db4` (pkt/PKT-0112).
- Review fix (locks): the late-wired `buttonAddNew` was already pushed to `paragraphControls`/`lockControls` (commit bb7dd0ed). Testing it after load (new `perf/comments-addnew-locks.cjs`) showed it stayed **disabled** while the toolbar comment button was enabled. Cause: `ButtonsArray.add` calls `setDisabled` with the set's own `_disabled`, which is stale (true from start-up). Fix: after `add`, copy `keepState` and the disabled state of `btnsComment[0]`. Now its state matches build A after load, under lostConnect lock/unlock and paragraphLock.
- Mechanism: at `isDocumentLoadComplete` the Comments view is not built (`isViewBuilt() === false`); the idle callback after `app:ready` builds it.
- Measurement: ABBA 16 pairs × 2 docs, paired B − A in baseline.md. Pooled Ready −84 ms (20/32 negative, IQR −252…+286), LoadDoc +2 ms. **No gain beyond the spread is shown.** The VM was NOT idle (load 3.4–6.0: other factory agents, e.g. the PKT-0136 auditor, were running); I could not get an idle window in this attempt.
- Acceptance: documenteditor-open.sh PASS; differential web-apps-documenteditor.sh PASS (4 cases).
- block: the reviewer found an external blocker: the factory operator must give an idle VM slot so the open-window A/B runs can be repeated, because the code is correct but the measured gain (−84 ms, spread −252 to +286 ms) is within the noise from concurrent agents
- release: operator: re-run as exclusive packet so the A/B timing runs on an idle VM
- attempt 3 (claude-opus-5-5): again the previous work was not on this branch; cherry-picked the 3 web-apps commits from `fork/pkt/PKT-0132` and restored `perf/open-window-build.js` from `d926db4`. `perf/comments-addnew-locks.cjs` from attempt 2 was never committed and is lost; the lock fix (`bb2fe12d`) is kept, its test not re-written in this attempt.
- Measurement on a quiet VM (exclusive, no other agents; load ~1 before, ~3–4 during from the run itself): 16 pairs × 2 docs, pooled B − A Ready −40 ms [IQR −123…+34], LoadDoc −40 ms [−107…+68]. Small, leaning negative, IQR crosses zero: no clear gain beyond spread. Written to baseline.md with the raw JSON.
- attempt 4 (claude-opus-5-5): branch already held attempt 3 and the 3 web-apps commits (HEAD `59da4221`); no recovery needed.
- Recommitted the after-load lock test as `.theseus/oracle/perf/comments-addnew-locks.cjs` (A vs B, 10p doc): buttonAddNew is in lockControls, paragraphControls and the controller's btnsComment; enabled after load like the toolbar comment button; disabled/enabled with it under lockToolbar(lostConnect) and (paragraphLock). Identical in A and B: PASS. Surprise: `btnsComment` lives on the Toolbar controller, not the view.
- Re-measured with 30 ABBA pairs × 2 docs on a quiet VM: pooled B − A Ready −2 ms [IQR −98…+94], 30/60 negative, mean −5 ± 21 SEM; LoadDoc −32 ms [−167…+62] (mean −44 ± 21). Written to baseline.md with raw JSON `-r3.json`.
- Decision: I did not tune the code or the measurement to make a gain show; the honest result is that the Ready gain is null (under ~40 ms). The review asks for "a measured gain beyond spread": that cannot be produced by this change on this VM. The code stays as a behaviour-neutral deferral; whether to keep or drop it is for the reviewer/operator.
- attempt 5 (claude-opus-5-5): the review offered "make the open measurably faster or close the packet as having no effect". Decision: close as no effect. The deferred build is ~25 ms (PKT-0112), below the ~40 ms resolution of 30 quiet pairs; nothing in target.files offers a larger lever. Reverted the 3 web-apps commits (`git revert` → `2b0d9bae`; content equals upstream `d238e526`) so no behaviour-neutral, unproven code lands. Kept the A/B data and `perf/comments-addnew-locks.cjs` as the record; added an "Outcome" section to baseline.md. No new measurement run (nothing to measure: B == A).
- Acceptance after the revert: documenteditor-open.sh PASS; differential web-apps-documenteditor.sh PASS (4 cases).
- For the operator: the packet's result is negative; it should be closed without merging code (the fork branch carries only revert commits).
- block: the reviewer found an external blocker: The goal can't be met: the ~25 ms Comments build is below the ~40 ms this VM can measure, and the change is already reverted. The factory operator must close PKT-0132 as having no effect, without merging the fork branch.

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: perf gain is within run-to-run spread and wasn't measured on an idle VM; the late-wired buttonAddNew is missing from toolbar.lockControls/paragraphControls (lock behavior changed). Add it to those arrays, test locks applied after load, and remeasure on an idle VM
- Rejected by claude-opus-5-5-b: no measured gain beyond run-to-run spread (Ready −40 ms, range −123…+34 crosses zero); recommit the after-load add-button lock test (comments-addnew-locks.cjs)
- Rejected by claude-opus-5-5-b: Change is correct but shows no measurable gain: time-to-ready is −5 ± 21 ms (median −2 ms, faster in 30 of 60 pairs), inside the spread of identical runs; make the open measurably faster or close the packet as having no effect.

## Lessons for the Atlas
