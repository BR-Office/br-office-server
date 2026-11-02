---
id: SPAWN
title: Make e2e-convert.js work against the native JWT-enabled stack
type: refactor
priority: medium
module: oracle

origin:
  type: packet
  ref: PKT-0068

depends_on: []

target:
  files:
    - "[FILE]"
  create_in: []

context:
  cards: [oracle]
  references: []

contract:
  preserve:
    - "[WHAT MUST NOT CHANGE]"
  forbidden: []

acceptance:
  commands:
    - "[ORACLE COMMAND]"

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
---

## Goal
Update `.theseus/oracle/perf/e2e-convert.js` so it runs against the native Document Server (127.0.0.1:80, see environment.md): default base http://127.0.0.1, sample host 127.0.0.1, and sign requests with JWT (`Authorization: Bearer`, secret from /etc/euro-office/documentserver/local.json `services.CoAuthoring.secret.inbox.string` or an env var). Today it gets `{"error":-8}` on every pair.

## Essential context
Found by PKT-0068: it measured with a scratch copy that signed the body with jsonwebtoken (from DocService/node_modules). requires: [documentserver]

## Essential context

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
