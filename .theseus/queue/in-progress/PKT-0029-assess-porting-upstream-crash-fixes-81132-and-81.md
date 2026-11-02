---
id: PKT-0029
title: Assess porting upstream crash fixes 81132 and 81576
type: investigate
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:P5
depends_on: []
target:
  files: []
  create_in:
  - .theseus/diagnosis
context:
  cards:
  - docservice
  references:
  - .theseus/diagnosis/DIAG-docservice.md
contract:
  preserve:
  - Existing tests keep passing unchanged
  forbidden: []
acceptance:
  commands: []
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Locate the ONLYOFFICE commits for bug 81132 (client disconnect during file streaming crashes the process) and 81576 (SaveVersion not released after failed final assembly, prepare4shutdown hangs), describe the diff and whether it applies to Euro-Office main, for a human decision.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P5`).
Found by PKT-0017; 81132 is only on Euro-Office side branches such as release/v9.4.0, 81576 is absent from every Euro-Office ref.

## Suggested plan

## Executor log
- return: factory restarted on Theseus 0.16 (main-branch repair first)
- attempt 1: the executor's permissions refused: Bash: sed -n 60,120p .theseus/queue/done/PKT-0017-*.md; git branch -a | head; ls /home/claude; Bash: cd /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0029/0204548c-a824-57b7-bea3-1783011bc81a/scratch…; Bash: git clone -q --filter=blob:none https://github.com/ONLYOFFICE/server /tmp/claude-0/-home-claude-euro-office-server-these…; Bash: git clone -q --filter=blob:none https://github.com/Euro-Office/server /tmp/claude-0/-home-claude-euro-office-server-thes…; Bash: gh api "search/commits?q=repo:ONLYOFFICE/server+81132" --jq '.items[]|.sha+" "+.commit.message'; WebFetch; Bash: f=$(ls .theseus/spawn/PKT-0029-fetch-*.md); python3 - "$f" <<'EOF'

## Spawned packets

## Review

## Lessons for the Atlas
