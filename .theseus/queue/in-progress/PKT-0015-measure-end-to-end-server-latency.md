---
id: PKT-0015
title: Measure end-to-end server latency
type: investigate
priority: high
module: docservice

origin:
  type: packet
  ref: PKT-0013

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
    - .theseus/oracle/perf/bench-hotpaths.js

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
Add end-to-end server numbers to `.theseus/oracle/baseline.md`: latency (p50/p99) and throughput of open, co-edit round trip (change from user A seen by user B), save and ConvertService, with the full stack (PostgreSQL, Redis, RabbitMQ, x2t). Also the defect/crash rate from upstream history (github.com/Euro-Office/server).

## Essential context
PKT-0013 measured only in-process micro-benchmarks: the sandbox has Redis and psql but no RabbitMQ and no x2t binaries, and the local git history starts on 2026-10-28. Needs an environment with the full stack (e.g. the docker image) and permission to run it.

## Suggested plan
1. Start the stack; 2. drive N Socket.IO clients editing one document; 3. time ConvertService for docx/xlsx/pptx/pdf samples; 4. record scripts in `.theseus/oracle/perf/`.

## Executor log
- attempt 1: the executor's permissions refused: Bash: docker run -d --name eo -p 8080:80 -e JWT_ENABLED=false -e EXAMPLE_ENABLED=true ghcr.io/euro-office/documentserver:lates…; Bash: mkdir -p .theseus/oracle/perf/samples; for e in docx xlsx pptx pdf; do docker cp eo:/var/www/euro-office/documentserver/…; Bash: mkdir -p .theseus/oracle/perf/samples && docker cp eo:/var/www/euro-office/documentserver/document-templates/new/en-US/.…; Bash: docker exec eo python3 -c 'import json;f="/etc/euro-office/documentserver/local.json";j=json.load(open(f));v=j.pop("requ…; Bash: node .theseus/oracle/perf/e2e-convert.js 20 1 > /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0015…; Bash: gh api repos/Euro-Office/server --jq '{created_at,default_branch,open_issues_count,parent:.parent.full_name,source:.sour…; Bash: sh .theseus/oracle/perf/x2t-direct.sh; Bash: cd .theseus/spawn && python3 - <<'EOF'
- attempt 2: the executor's permissions refused: WebFetch; Bash: set -e; Bash: git rm -q -r .theseus/oracle/perf/samples .theseus/oracle/perf/x2t-direct.sh .theseus/spawn/PKT-0015-shorten-convertserv…

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: Goal requires upstream defect/crash rate, which was not measured; diff also changes 12 files against a budget of 6

## Lessons for the Atlas
