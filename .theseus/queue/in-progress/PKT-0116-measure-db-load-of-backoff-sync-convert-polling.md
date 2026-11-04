---
id: PKT-0116
title: Measure DB load of backoff sync-convert polling
type: investigate
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:r2:P4
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
estimated:
  files: 1
  diff_lines: 60
  source: planner
acceptance:
  commands:
  - grep -q "taskResult" .theseus/oracle/rounds/docservice-r2-dbload.md
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
Run SYNC=1 .theseus/oracle/perf/e2e-convert.js 10 4 against the installed server (original) and the worktree DocService on :8099 (new), count taskResult selects per request (PostgreSQL pg_stat_statements or log_statement) and record latency and select counts in .theseus/oracle/rounds/docservice-r2-dbload.md.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P4`).
PKT-0068 expects up to ~6 extra selects per sync request in the first 1.5 s; .theseus/oracle/rounds/docservice-r2.md shows how to run the worktree server on :8099.

## Suggested plan

## Executor log
- Ran both servers (installed :80, worktree :8099 from source) with `SYNC=1 e2e-convert.js 10 4`, log_statement=all via ALTER SYSTEM + reload (reset after); results in `.theseus/oracle/rounds/docservice-r2-dbload.md`.
- Decision: log_statement instead of pg_stat_statements (that needs shared_preload_libraries and a PostgreSQL restart, which would disturb the running stack).
- Decision: attribute selects to requests by the `conv_k...` key in the DETAIL line, so background queries of the other server are excluded.
- Surprise: the pg driver uses prepared statements, logged as `execute <unnamed>:` not `statement:`; first count gave 0.
- Result: taskResult selects 2.1 -> 4.0 per request (max +5 on docx->pdf), within PKT-0068's ~6 extra; UPDATE/INSERT unchanged; p50 latency 0.65-2.5 s lower.
- Not done: per-query duration, concurrency > 4. No code changed, no tests affected.

## Spawned packets

## Review

## Lessons for the Atlas
- DocService DB queries are prepared: grep PostgreSQL logs for `execute <unnamed>:`; per-request attribution works via the task key in `DETAIL: parameters`.
