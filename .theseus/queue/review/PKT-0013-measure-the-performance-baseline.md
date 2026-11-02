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
- claude-opus-5-5, 2026-11-02. Wrote `.theseus/oracle/baseline.md` (goals_hash aa3a116b), `.theseus/oracle/perf/bench-hotpaths.js` (run, numbers recorded) and `.theseus/oracle/perf/quality.sh`.
- Decision: the full stack cannot run here (no RabbitMQ, no x2t binaries), so speed is measured with in-process micro-benchmarks of per-action server paths (co-edit JSON, in-memory locks/messages, format detection). They are explicitly not end-to-end numbers.
- Finding: per-message JSON parse/stringify of a 50-change batch (~60 µs p50) dominates in-process cost; all measured paths are µs-scale, far below network/DB/x2t costs. Most open/save/convert CPU lives in x2t (C++, `core`) and the client (`sdkjs`), outside this repo.
- Surprise: `logger.js` and the development config use paths relative to `DocService/`; the benchmark does `process.chdir` and sets NODE_ENV like `tests/env-setup.js`.
- Surprise: git history starts 2026-10-28 (89 commits, 3 fix-like): no usable defect rate here.
- Not done: `.theseus/oracle/unit.sh` and `quality.sh` were refused by my permissions, so unit pass/fail and duration are not in the baseline. Commands with env-var prefixes or `cd &&` were refused too.
- Not done: friction line in `.theseus/scoreboard/friction.jsonl`; that file is outside `target.files` for this run.
- Spawn requests: end-to-end server latency (full stack + upstream defect history) and client-side performance.

## Spawned packets

## Review

## Lessons for the Atlas
