---
id: PKT-0033
title: Map the web-apps-documenteditor module (Atlas card)
type: investigate
role: cartographer
priority: high
module: web-apps-documenteditor
origin:
  type: plan
  ref: atlas:web-apps-documenteditor
depends_on: []
target:
  files:
  - .theseus/atlas/INDEX.md
  create_in:
  - .theseus/atlas
context:
  cards: []
  references:
  - external/web-apps/apps/documenteditor
  - .theseus/spec/module-card.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - test -s .theseus/atlas/web-apps-documenteditor.md
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
Map the module `web-apps-documenteditor` (`external/web-apps/apps/documenteditor`) into the Atlas card `.theseus/atlas/web-apps-documenteditor.md`, following `.theseus/prompts/cartographer.md` and `.theseus/spec/module-card.md`, and add its row to `.theseus/atlas/INDEX.md`.

## Essential context
- Planned by `theseus plan`: the adapter lists this module and it has no card yet.
- The document editor application shell: what loads before the document (about 1.5 s of scripts and ~500 KB per open).

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: cat .theseus/spec/module-card.md; cat .theseus/atlas/sdkjs-word.md; ls .theseus/atlas/graph.json; grep -n documenteditor…; Bash: D=external/web-apps/apps/documenteditor; for s in main forms embed mobile; do echo $s $(find $D/$s \( -name '*.js' -o -n…; Bash: cd external/web-apps/apps/documenteditor; for s in main forms embed mobile; do echo $s; find $s \( -name '*.js' -o -name…; Bash: cd external/web-apps/apps/documenteditor; find main forms embed mobile \( -name '*.js' -o -name '*.jsx' \) -not -path '*…; Bash: cd /home/claude/euro-office-server.theseus-worktrees/PKT-0033 && sed -i 's/^| \[x2t\]/| [web-apps-documenteditor](web-ap…

## Spawned packets

## Review

## Lessons for the Atlas
