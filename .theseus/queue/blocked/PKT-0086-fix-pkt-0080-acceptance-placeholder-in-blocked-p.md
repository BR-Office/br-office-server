---
id: PKT-0086
title: Fix PKT-0080 acceptance placeholder in blocked/ packet file
type: investigate
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0083

depends_on: []

target:
  files:
    - .theseus/queue/blocked/PKT-0080-libfont-table-lookup-for-hb-get-script-horizonta.md
  create_in: []

context:
  cards: [sdkjs-common]
  references: []

contract:
  preserve:
    - PKT-0080 code change, Goal and Executor log stay as written (the log may keep quoting `<samples-dir>` as history)
    - Only the acceptance block of PKT-0080 changes
  forbidden: []

acceptance:
  commands:
    - "awk '/^acceptance:/,/^budget:/' .theseus/queue/*/PKT-0080-*.md | grep -q 'make-samples.py /tmp/eo-samples'"
    - "! awk '/^acceptance:/,/^budget:/' .theseus/queue/*/PKT-0080-*.md | grep -q '<samples-dir>'"
    - test -f .theseus/oracle/perf/profile-fonts.js

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5-b
  reviewer: null
---

## Goal
In `.theseus/queue/blocked/PKT-0080-*.md` replace the acceptance command's literal `<samples-dir>` with `python3 .theseus/oracle/perf/make-samples.py /tmp/eo-samples && node .theseus/oracle/perf/profile-fonts.js /tmp/eo-samples external/sdkjs 3`. Change only the acceptance block; leave the Executor log (which quotes `<samples-dir>` historically) as is.

## Essential context
- PKT-0083 targeted `queue/in-progress/PKT-0080-*`, but PKT-0080 is in `blocked/`, so the edit was outside its target (R2) and was reverted.
- profile-fonts.js is now on the base via PKT-0083.
- Acceptance suggestion: `grep -A20 '^acceptance:' <file> | grep -vq '<samples-dir>'` style check scoped to the acceptance block, not the whole file.

## Suggested plan
- Set target.files to PKT-0080's path in whatever queue state it is in when this packet is claimed (or use a glob).
- Edit only the acceptance command line; run the acceptance commands above.

## Executor log
- attempt 1: acceptance failed: `test -f .theseus/oracle/perf/profile-fonts.js`
- attempt 2: acceptance failed: `test -f .theseus/oracle/perf/profile-fonts.js`
- attempt 3: acceptance failed: `test -f .theseus/oracle/perf/profile-fonts.js`
- Replaced only the acceptance command in blocked/PKT-0080 with `python3 .theseus/oracle/perf/make-samples.py /tmp/eo-samples && node .theseus/oracle/perf/profile-fonts.js /tmp/eo-samples external/sdkjs 3`; kept the trailing comment, Goal and Executor log unchanged.
- Acceptance 1 and 2 pass. **Acceptance 3 fails**: `.theseus/oracle/perf/profile-fonts.js` is not on this base. It exists only in commit 7565b86 (PKT-0083), which is not an ancestor of this branch (PKT-0083 not merged yet). Creating it is outside target (create_in empty), so I did not restore it. This packet should be delivered after PKT-0083 is merged, or rebased onto it.
- No sdkjs changes.
- Attempt 2: re-checked. profile-fonts.js still absent; commit 7565b86 is only on `pkt/PKT-0083`, and PKT-0083 sits in `queue/blocked/` (not merged). Restoring the file is outside target (create_in empty), so not done. Acceptance 1–2 pass, 3 fails until PKT-0083's profile-fonts.js lands on the base. Factory decision needed: merge PKT-0083 (or just its profile-fonts.js) first, or drop acceptance 3 / add `.theseus/oracle/perf/` to create_in.
- Attempt 3: unchanged situation. `git log --all` shows profile-fonts.js only in 7565b86 (pkt/PKT-0083, unmerged) and 75204fd (PKT-0072, later deleted). Not restored: outside target (create_in empty). Acceptance 1–2 pass; 3 cannot pass on this base without a factory action (merge PKT-0083 or widen create_in). Further attempts by the executor cannot change this.
- block: 3 attempts failed; last: acceptance failed: `test -f .theseus/oracle/perf/profile-fonts.js`. Output:
```

```

## Spawned packets

## Review

## Lessons for the Atlas
