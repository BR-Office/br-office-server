---
id: PKT-0026
title: Measure Common's share of server-side request cost
type: investigate
priority: medium
module: common
origin:
  type: plan
  ref: plan:common:dcb03039:P1
depends_on: []
target:
  files:
  - .theseus/oracle/baseline.md
  create_in:
  - .theseus/oracle/perf
context:
  cards:
  - common
  references:
  - .theseus/diagnosis/DIAG-common.md
contract:
  preserve:
  - Existing tests keep passing unchanged
  forbidden: []
allowed_commands:
- '*'
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
Profile DocService under the PKT-0018 load test (load-coedit.js 50x5) and during a ConvertService run (e2e-convert.js) with node --cpu-prof. Report the share of DocService CPU and wall time spent in Common/ (operationContext/tenant config, storage-base, taskqueueRabbitMQ, utils, logger) and add it to baseline.md.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-common.md` (row `P1`).
The baseline has measured the server as a whole (receive → broadcast 4 ms p50, 0.28 core at 1 771 broadcasts/s; conversion overhead 55–95 ms) but has never isolated Common. The native package is installed (adapter/environment.md). This measurement decides whether DIAG-common stays keep.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
