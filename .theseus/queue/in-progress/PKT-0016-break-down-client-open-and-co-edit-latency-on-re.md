---
id: PKT-0016
title: Break down client open and co-edit latency on realistic documents
type: investigate
priority: medium
module: project

origin:
  type: packet
  ref: PKT-0014

depends_on: []

target:
  files:
    - .theseus/oracle/baseline.md
  create_in:
    - .theseus/oracle/perf

context:
  cards: [project]
  references: []

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
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
rejected_reviews: 1
---

## Goal
Break down client open and co-edit latency on realistic documents.

## Essential context
PKT-0014 measured the client only on an empty docx with `.theseus/oracle/perf/client-perf.js`: open p50 3.1 s, remote apply p50 0.1 s / p90 0.36 s, typing p50 31 ms, heap 73 MB. Still missing: a split of open time (bundle and font load, Editor.bin download, x2t, render) from Performance API and network timings; the cause of the remote-apply tail; large docx and xlsx/pptx samples. The container must be started with `ALLOW_PRIVATE_IP_ADDRESS=true` or the example documents never load.

## Suggested plan

## Executor log
- return: factory restarted with Theseus 0.13.2 (baseline commands for nested measurements)
- attempt 1: the executor's permissions refused: Bash: cat .theseus/oracle/perf/client-perf.js; curl -fsSL -o /tmp/eo.deb https://github.com/Euro-Office/DocumentServer/release…; Bash: S=/tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0016/0204548c-a824-57b7-bea3-1783011bc81a/scratchp…; Bash: curl -fsSL -o /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0016/0204548c-a824-57b7-bea3-1783011bc…; Bash: which python3; python3 --version; ls /usr/bin/python3*; grep -n python /var/lib/dpkg/info/update-notifier-common.postins…; Bash: python3 --version; /usr/bin/python3.12 -c "import apt_pkg" && echo ok312; Bash: dpkg -L euro-office-documentserver | grep -E "postinst|\.sql$|supervisor|nginx" | head; dpkg -l | grep -E "rabbit|erlang…; Read

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: No latency measurements were taken, so the goal is not met; set up the Document Server stack (or grant the needed permissions), fix environment.md, and make the acceptance check require real numbers before retrying.

## Lessons for the Atlas
