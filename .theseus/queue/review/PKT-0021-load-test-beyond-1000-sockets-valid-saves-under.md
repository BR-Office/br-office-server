---
id: PKT-0021
title: Load-test beyond 1000 sockets, valid saves under load, pptx-to-pdf outlier
type: investigate
priority: medium
module: docservice

origin:
  type: packet
  ref: PKT-0018

depends_on: []

target:
  files:
    - "[FILE]"
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
rejected_reviews: 1
---

## Goal
Extend PKT-0018's load test: (1) find why 200 docs × 5 clients (direct to port 8000) gives no result in 300 s and where the ceiling is; (2) make saves under load valid (generate per-document changes that fit, so callback status 2 instead of 3) and time save assembly; (3) explain the one pptx → pdf conversion that took 124 s (deck-50.pptx, 1 of 3 runs).

## Essential context
See baseline.md section "Co-edit tail split, load test, large files (PKT-0018)" and perf/load-coedit.js, perf/convert-large.js. No source change; measurement only.

## Suggested plan

## Executor log
- claude-opus-5-5, 2026-11-02. Native package 9.3.7-1, 2-CPU VM, direct to port 8000 (no nginx), DocService DEBUG log on.
- **Scope decision:** `target.files` is the placeholder `"[FILE]"`, `create_in` is empty and `acceptance.commands` is empty, so the only file I changed is this packet (plus spawn requests and friction). PKT-0018's scripts are not on this branch (PKT-0018 unmerged); I copied `load-coedit.js` / `convert-large.js` to the session scratchpad and patched the copies there. All numbers are below; recording them in baseline.md/perf is requested as a spawn.
- **Acceptance:** none defined, so nothing to run. `theseus validate` was not part of the acceptance.
### (1) 200 docs x 5: why no result, and the ceiling
- Cause: **a harness bug, not a server limit.** When a 2nd editor joins, DocsCoServer puts an auth lock on the doc and starts a timer (`expire.lockDoc` = 30 s, `setLockDocumentTimer`, DocsCoServer.js:2327). The real editor releases it with `unLockDocument`; load-coedit.js never sends it. Each change in the change phase resets the timer, but load-coedit.js opens docs **one after another** (200 docs: 38 s idle, 110 s with the converter backlogged), so docs that wait more than 30 s for the change phase have their lock holder dropped (`lockDocumentsTimerId timeout` -> `server namespace disconnect`, 71 docs in one run). The script then waits for `saveLock` with **no timeout** -> it hangs forever. 100x10 opened in less than 30 s, so it was not affected.
- Fixes in the scratchpad copy: first client sends `{type:'unLockDocument', unlock:true, isSave:false}` after each doc opens; 10 s timeout on the `saveLock` wait; open/change timestamps on stderr.
- Results after the fix (30 s, 2 changes/s/doc, medium-10p.docx, ms):
| Docs x clients | sockets | changes/s | broadcasts/s | ack p50/p99/max | broadcast p50/p99/max | open p99 | DocService cores | postgres |
|---|---|---|---|---|---|---|---|---|
| 200 x 5 | 1 000 | 393 | 1 574 | 4 / 28 / 109 | 4 / 27 / 109 | 177 | 0.40 | 0.25 |
| 200 x 10 | 2 000 | 393 | 3 541 | 5 / 28 / 88 | 5 / 28 / 88 | 159 | 0.54 | 0.25 |
  No errors, no lost broadcasts. No ceiling reached at 2 000 sockets / 3 500 broadcasts/s; p99 rises from 12 to 28 ms with the doubled change rate. Not tried higher: the load generator shares the 2 CPUs. DocService open-file soft limit is 20 000 (no fd problem).
- Before the fix (same run, no unlock): 200x5 finished only thanks to the timeout: 71 noLockReply, 142 missing broadcasts.
### (2) Valid saves under load: moved out of scope (attempt 2)
- Attempt 2 (claude-opus-5-5, 2026-11-02): per the review, the goal is narrowed to (1) and (3); (2) lives in spawn request `PKT-0021-valid-saves-under-load-...`. Filled target (this packet, friction, spawn/), contract (measurement only, no source change) and acceptance (`theseus validate` + a diff check that only .theseus queue/spawn/friction files changed). Both acceptance commands pass. Findings below kept as context for the new packet.
- All saves still return status 3. x2t fails applying the replayed change: `TypeError: Cannot read property 'Check' of undefined at CChangesRunAddItem.Load` (medium-10p.docx) and `'Update_OnAdd' of undefined` on a blank `new (1).docx`, even for 1 doc and 1 change, exit code 86. The captured change refers to object ids created in the capturing browser session, so no single change fits any document. Fixing this needs a Playwright capture of the whole change sequence -> spawn request. Save assembly time is therefore only indicative: 200 docs -> 138-143 s for all callbacks (failing assembly, maxprocesscount 1).
### (3) pptx -> pdf 124 s outlier: explained
- deck-50.pptx -> pdf on an idle server, 10 runs: 1 966-2 789 ms (no outlier).
- The same conversion started right after a 100x2 load test closed its sockets: 2 187, 2 386, then **68 662 ms**. The first two ran before the save timers (5 s) fired; the third waited in the queue behind the 100 save assemblies. FileConverter `maxprocesscount` = 1 and the conversion and save-assembly tasks share one RabbitMQ queue, so a conversion waits for every save queued before it (failing saves also retry: `maxRedeliveredCount` 2, callback backoff).
- In PKT-0018, convert-large.js ran after the load test (saveAllMs 67 s for 100 docs, status 3) and deck-50.pptx is the first file alphabetically, so its pdf runs were the first conversions. 124 s matches waiting out the leftover save queue. Not a converter timeout (`visibilityTimeout` 300 s, `downloadTimeout` 2 m do not match the timings). I could not check the PKT-0018 logs: /tmp/ds-doc.log starts at 17:18 today, after that run.
- Lesson for the measurements: drain the converter queue (or restart) between the load test and conversion timing.
### Surprises
- The DocService DEBUG log grows quickly (140 MB after these runs, in /tmp/ds-doc.log, not /var/log).
- Saves from a killed run keep the converter busy for minutes and slow the next run's open phase (38 s -> 110 s for 200 docs).

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: Goal (2) not done (saves still return status 3, so save assembly timing is meaningless); implement it, or narrow the goal to items 1 and 3 and move item 2 to its own packet, and fill in the placeholder target, contract and acceptance.

## Lessons for the Atlas
