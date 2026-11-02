---
id: PKT-0017
title: Defect and crash rate from upstream history
type: investigate
priority: medium
module: docservice

origin:
  type: packet
  ref: PKT-0015

depends_on: []

target:
  files:
    - .theseus/oracle/baseline.md
  create_in:
    - .theseus/oracle/perf

context:
  cards: [docservice]
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
  executor: claude-opus-5-5-b
  reviewer: claude-opus-5-5
rejected_reviews: 3
resume: false
---

## Goal
Add the server's defect and crash rate from upstream history to `baseline.md`. Sources are github.com/Euro-Office/server and ONLYOFFICE/server before it. Report bug issues and fix commits per month or release, the crash-related ones, and the files or modules where they concentrate.

## Essential context
The local git history starts on 2026-10-28, so it cannot be used for this. In PKT-0015 the executor's permissions refused `gh api repos/Euro-Office/server`. This packet needs `gh`, or a network `git clone` of upstream, to be allowed for the executor.

## Suggested plan
1. Clone upstream or query the GitHub API. 2. Classify fix commits and bug issues. 3. Compute the rate per period and per file. 4. Record the script in `.theseus/oracle/perf/`.

## Executor log
- attempt 1: the executor's permissions refused: Bash: gh api repos/Euro-Office/server --jq '.full_name,.open_issues_count,.has_issues' 2>&1 | head; gh api repos/ONLYOFFICE/se…; Bash: gh api repos/Euro-Office/server --jq '.full_name,.open_issues_count,.has_issues'; Bash: cd /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0017/0204548c-a824-57b7-bea3-1783011bc81a/scratch…; Bash: S=/tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0017/0204548c-a824-57b7-bea3-1783011bc81a/scratchp…; WebFetch; Bash: git --git-dir=/tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0017/0204548c-a824-57b7-bea3-1783011bc…
- attempt 2: the executor's permissions refused: Bash: python3 - <<'EOF'
- attempt 3: the executor's permissions refused: Bash: f=$(ls .theseus/queue/in-progress/PKT-0017-*.md)
- `gh api repos/Euro-Office/server` and WebFetch on the GitHub issues page were refused by permissions again;
  a network `git clone --bare --filter=blob:none` of both upstreams was allowed. So the rate is **fix commits**,
  not bug issues; the issue count is still a gap (recorded in baseline.md).
- Script `.theseus/oracle/perf/defect-history.js` (Node, no deps) classifies commit subjects with regexes,
  aggregates per year, month, module and file, and lists crash-related commits.
- Surprise: Euro-Office's history has 1 828 duplicate commits (same date + subject, new hashes, from a rebase).
  Deduplicated by (date, subject); without it the counts were nearly doubled.
- Surprise: ONLYOFFICE has 7 crash-related fixes in 2026 that do not appear by subject on Euro-Office's
  default branch (e.g. process crash on client disconnect during streaming, prepare4shutdown hang).
  A grep by bug number to confirm was refused by permissions; baseline.md says to check by content.
- Caveat recorded: the fix share before 2018 is low because of commit-message conventions, not code quality.
- No source code changed. No spawn: porting the missing upstream fixes is a decision for the humans,
  recorded as a finding in baseline.md.
- Attempt after rejection: `gh`/WebFetch were not retried (still refused). Decision: **narrow the goal** —
  this packet delivers fix-commit and crash-fix rates from git; bug-*issue* counts per month/release are
  requested as a follow-up in `.theseus/spawn/PKT-0017-bug-issue-counts-…md`, which states it needs
  `gh api` allowed for the executor. baseline.md says so in the method paragraph and the gap table.
- Aligned documented rules with the script: the script's header comment listed `issue` (not in the code)
  and the baseline text omitted `fixing|bugfix|bug #N` and the "any subject containing crash" rule.
  Both now quote the actual `FIX`/`CRASH` regexes. Counts were not recomputed (re-clone not needed: the
  text was wrong, the numbers came from the code).- Attempt 3: `gh api` is still not allowed and was not retried. Without it this packet cannot produce the bug-issue counts. The goal stays narrowed to fix commits, and the issue counts are in the spawned request. A human must either accept that narrowing or allow `gh api` for the executor.
- block: 3 attempts failed; last: Goal requires bug-issue counts per month/release, not delivered (gh api refused); a human must allow gh api or formally narrow the goal to fix commits, and the counts must then be recomputed from the current script.
- release: gh api is not available here; git clone of the upstream history is (see environment.md)
- return: factory restarted: measurement packets now run with every privilege (Theseus 0.13.4)

## Spawned packets

## Review
- Rejected by claude-opus-5-5: Goal requires bug-issue counts per month/release, which were not produced (gh/WebFetch refused); allow gh for the executor or narrow the goal and spawn an issues packet, and align the documented crash/fix rules with the script
- Rejected by claude-opus-5-5: Goal requires bug-issue counts per month/release from GitHub; not produced (gh api refused). Allow `gh api` for the executor and add the counts, or have a human narrow the goal and accept the spawned follow-up.
- Rejected by claude-opus-5-5: Goal requires bug-issue counts per month/release, not delivered (gh api refused); a human must allow gh api or formally narrow the goal to fix commits, and the counts must then be recomputed from the current script.

## Lessons for the Atlas
