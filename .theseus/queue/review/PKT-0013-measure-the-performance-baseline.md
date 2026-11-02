---
id: PKT-0013
title: Measure the performance baseline
type: investigate
priority: critical
module: project
origin:
  type: plan
  ref: baseline:aa3a116b
depends_on: []
target:
  files:
  - .theseus/oracle/baseline.md
  create_in:
  - .theseus/oracle
context:
  cards: []
  references:
  - .theseus/adapter/adapter.yaml
  - .theseus/atlas/INDEX.md
contract:
  preserve:
  - No change to the project's source code
  forbidden: []
allowed_commands:
- node
- npm
- npx
acceptance:
  commands:
  - test -s .theseus/oracle/baseline.md
budget:
  max_files_changed: 8
  max_diff_lines: 1500
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Measure, where users feel it, what the adapter's `goals.measure` asks, and write `.theseus/oracle/baseline.md`: the scenarios that matter, where each one runs (server or client, and in which repository), how to reproduce each measurement (scripts under `.theseus/oracle/perf/`), and today's numbers. Put `goals_hash: aa3a116b` in its YAML header.

## Essential context
- The goal: Gain performance in quality (fewer defects, crashes and regressions) and in speed (latency and throughput of what users do), wherever users feel it: in the server or in the client. Change of language, partial or total, where it delivers that gain.
- What to measure:
  - Speed: latency and throughput of what users do (open, co-edit, save, convert), on the server or in the client
  - Quality: defects, crashes and regressions, and what in the code makes them likely
- Performance can matter on the server or in the client. Do not assume either: find where users feel it. If it lives outside this repository (for example in a client repository), say so, measure what can be measured here, and request the rest with `theseus packet new` or record it as a gap.
- The diagnoses of every module are judged against these numbers.

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: cat > .theseus/oracle/perf/bench-hotpaths.js <<'EOF'; Bash: chmod +x .theseus/oracle/perf/quality.sh; (cd DocService && NODE_CONFIG_DIR=../Common/config node ../.theseus/oracle/per…; Bash: cd DocService && NODE_CONFIG_DIR=../Common/config node ../.theseus/oracle/perf/bench-hotpaths.js 2>&1 | tail -8; Bash: NODE_CONFIG_DIR=Common/config node .theseus/oracle/perf/bench-hotpaths.js; Bash: sh .theseus/oracle/perf/quality.sh; Bash: .theseus/oracle/unit.sh

## Spawned packets

## Review

## Lessons for the Atlas
