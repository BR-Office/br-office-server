---
id: PKT-0083
title: "Fix PKT-0080 acceptance: placeholder samples-dir and missing profile-fonts.js"
type: investigate
priority: medium
module: sdkjs-common

origin:
  type: packet
  ref: PKT-0080

depends_on: []

target:
  files:
    - .theseus/queue/in-progress/PKT-0080-libfont-table-lookup-for-hb-get-script-horizonta.md
  create_in:
    - .theseus/oracle/perf/

context:
  cards: [sdkjs-common]
  references: []

contract:
  preserve:
    - PKT-0080 code change and Executor log stay as written; only its acceptance command changes
    - Existing oracle scripts in .theseus/oracle/perf/ keep their behaviour
  forbidden: []

acceptance:
  commands:
    - test -f .theseus/oracle/perf/profile-fonts.js
    - "! grep -q '<samples-dir>' .theseus/queue/in-progress/PKT-0080-*.md"

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
Make PKT-0080's acceptance runnable: merge `.theseus/oracle/perf/profile-fonts.js` (commit 75204fd, only on pkt/PKT-0072) to the base branch and replace the literal `<samples-dir>` in the acceptance with the real samples path (e.g. the output dir of `make-samples.py`). As written, the shell parses `<samples-dir>` as stdin redirection and fails before node starts (`samples-dir: No such file`), so no executor can pass it within target.files.

## Essential context
- Second rejection of PKT-0080 was this exact shell error; the code change itself is unaffected.
- The profiler measures the installed bundle in /var/www, so it also needs build+mirror (`sdkjs-mirror.sh`) of the patched common.js to show the gain.

## Suggested plan
- Cherry-pick profile-fonts.js from 75204fd (pkt/PKT-0072) into .theseus/oracle/perf/.
- Replace `<samples-dir>` in PKT-0080's acceptance with the real samples directory produced by make-samples.py.

## Executor log
- attempt 1: changed .theseus/queue/blocked/PKT-0080-libfont-table-lookup-for-hb-get-script-horizonta.md, outside the target (rule R2)
- attempt 2: the spawn request PKT-0083-fix-pkt-0080-acceptance-placeholder-in-blocked-p.md still has template placeholders: fill in its target, contract and acceptance (rule R6)
- Restored `.theseus/oracle/perf/profile-fonts.js` byte-for-byte from commit 75204fd (pkt/PKT-0072); no other oracle script touched.
- PKT-0080 acceptance line now: `python3 .theseus/oracle/perf/make-samples.py /tmp/eo-samples && node .theseus/oracle/perf/profile-fonts.js /tmp/eo-samples external/sdkjs 3`. Decision: generate samples in the command itself so it does not depend on a pre-existing /tmp dir (/tmp/eo-samples is the path every earlier packet used; make-samples.py is deterministic, seed 18, and writes large-100p.docx).
- Surprise: PKT-0080 is in `queue/blocked/`, not `in-progress/` as target.files says; I edited the same-named file in blocked/. Consequently the second acceptance command passes trivially (glob matches nothing, grep exits 2).
- Conflict not resolved: `<samples-dir>` still appears 5 times in PKT-0080's Executor log (lines quoting the old failures). The contract says the log stays as written, so I left it; when PKT-0080 is moved back to in-progress, this packet's grep would fail on that history. Reviewer/factory should decide whether the grep should target only the acceptance block.
- Not run: the profiler itself (needs PKT-0080's build + sdkjs-mirror.sh); out of scope here.
- Attempt 2 (after R2 rejection): reverted my edit to `queue/blocked/PKT-0080-*.md` (outside target.files, which names `in-progress/`). Kept profile-fonts.js. The PKT-0080 acceptance fix is now requested as a spawned packet (`.theseus/spawn/`) targeting the blocked/ path. Lesson: a packet that edits another packet must target its current queue state, or use a glob.
- Acceptance: both commands pass; the grep one passes only because no PKT-0080 file is in in-progress/ (vacuous).
- Attempt 3: confirmed blocked/PKT-0080 is byte-identical to base (diff vs claim commit touches only profile-fonts.js, this packet, friction.jsonl, spawn request). Filled the spawn request's contract and acceptance (awk-scoped to PKT-0080's acceptance block, glob over queue states so it survives moves) and removed the duplicate empty section.

## Spawned packets

## Review

## Lessons for the Atlas
