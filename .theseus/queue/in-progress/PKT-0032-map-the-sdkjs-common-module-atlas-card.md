---
id: PKT-0032
title: Map the sdkjs-common module (Atlas card)
type: investigate
role: cartographer
priority: high
module: sdkjs-common
origin:
  type: plan
  ref: atlas:sdkjs-common
depends_on: []
target:
  files:
  - .theseus/atlas/INDEX.md
  create_in:
  - .theseus/atlas
context:
  cards: []
  references:
  - external/sdkjs/common
  - .theseus/spec/module-card.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - test -s .theseus/atlas/sdkjs-common.md
budget:
  max_files_changed: 3
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Map the module `sdkjs-common` (`external/sdkjs/common`) into the Atlas card `.theseus/atlas/sdkjs-common.md`, following `.theseus/prompts/cartographer.md` and `.theseus/spec/module-card.md`, and add its row to `.theseus/atlas/INDEX.md`.

## Essential context
- Planned by `theseus plan`: the adapter lists this module and it has no card yet.
- Shared browser engine of the editors (fonts, drawing, serialization, co-editing client). 14-25 font files per open.

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: cat .theseus/atlas/sdkjs-word.md .theseus/atlas/INDEX.md; ls external/sdkjs/common; wc -l external/sdkjs/common/*.js | t…; Bash: cd external/sdkjs/common && wc -l $(find . -name '*.js') | sort -n | tail -25; ls libfont Drawings collaboration Charts; Bash: cd /home/claude/euro-office-server.theseus-worktrees/PKT-0032 && cat > .theseus/atlas/sdkjs-common.md <<'EOF'; Bash: cd /home/claude/euro-office-server.theseus-worktrees/PKT-0032 && echo '{"packet":"PKT-0032","role":"cartographer","model…

## Spawned packets

## Review

## Lessons for the Atlas
