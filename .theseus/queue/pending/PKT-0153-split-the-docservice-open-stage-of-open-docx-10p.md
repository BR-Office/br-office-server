---
id: PKT-0153
title: Split the DocService open stage of open-docx-10p (538 ms)
type: investigate
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:r3:P1
depends_on: []
target:
  files: []
  create_in:
  - .theseus/oracle/rounds
context:
  cards:
  - docservice
  references:
  - .theseus/diagnosis/DIAG-docservice.md
contract:
  preserve:
  - Existing tests keep passing; their assertions change only where the goal requires it, and the log says why
  forbidden: []
requires:
- documentserver
- browser
estimated:
  files: 1
  diff_lines: 80
  source: planner
acceptance:
  commands:
  - grep -q "commandOpen" .theseus/oracle/rounds/docservice-r3-open.md
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: null
  reviewer: null
---

## Goal
Run the open-docx-10p journey 5 times with the DocService DEBUG log and split server-open-docservice (538 ms p50) into commandOpen, taskresult upsert, RabbitMQ round trip and wait-for-x2t marks; record the split and the one change that would remove most of it in .theseus/oracle/rounds/docservice-r3-open.md.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P1`).
Same stage is 81-206 ms in the other open maps (journeys/open-*.md); the difference may be the first-open conversion wait attributed to DocService.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
