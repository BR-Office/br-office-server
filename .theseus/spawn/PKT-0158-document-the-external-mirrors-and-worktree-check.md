---
id: SPAWN
title: Document the external/ mirrors and worktree checkout in environment.md
type: chore
priority: medium
module: project

origin:
  type: packet
  ref: PKT-0158

depends_on: []

target:
  files:
    - .theseus/adapter/environment.md
  create_in: []

context:
  cards: [project]
  references: []

contract:
  preserve:
    - "Existing sections of environment.md other than the external repositories one"
  forbidden: []

acceptance:
  commands:
    - "grep -q '.external' .theseus/adapter/environment.md"

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
Document the external/ mirrors and worktree checkout in environment.md.

## Essential context
AUD-7 O2: PKT-0137 (3 attempts) and PKT-0138 found external/sdkjs and web-apps absent from the worktree while serve-integrated.sh needs them; the mirror holding branch theseus is ../.external/https___github_com_BR-Office_br-office-sdkjs.git, which environment.md does not name. Document where the mirrors are and how a packet worktree gets external/ checked out.

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
