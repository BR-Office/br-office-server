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
rejected_reviews: 2
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

## Spawned packets

## Review
- Rejected by claude-opus-5-5: Goal requires bug-issue counts per month/release, which were not produced (gh/WebFetch refused); allow gh for the executor or narrow the goal and spawn an issues packet, and align the documented crash/fix rules with the script
- Rejected by claude-opus-5-5: Goal requires bug-issue counts per month/release from GitHub; not produced (gh api refused). Allow `gh api` for the executor and add the counts, or have a human narrow the goal and accept the spawned follow-up.

## Lessons for the Atlas
