---
id: PKT-0003
title: Map the docservice module (Atlas card)
type: investigate
role: cartographer
priority: high
module: docservice
origin:
  type: plan
  ref: atlas:docservice
depends_on: []
target:
  files:
  - .theseus/atlas/INDEX.md
  create_in:
  - .theseus/atlas
context:
  cards: []
  references:
  - DocService
  - .theseus/spec/module-card.md
contract:
  preserve:
  - No source code changes
  forbidden: []
acceptance:
  commands:
  - test -s .theseus/atlas/docservice.md
budget:
  max_files_changed: 3
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
---

## Goal
Map the module `docservice` (`DocService`) into the Atlas card `.theseus/atlas/docservice.md`, following `.theseus/prompts/cartographer.md` and `.theseus/spec/module-card.md`, and add its row to `.theseus/atlas/INDEX.md`.

## Essential context
- Planned by `theseus plan`: the adapter lists this module and it has no card yet.
- Document coordination server (co-editing, conversion requests, WOPI).

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: cd /home/claude/euro-office-server.theseus-worktrees/PKT-0003; cat .theseus/spec/module-card.md; ls .theseus/atlas .thes…; Bash: cd DocService/sources && grep -nE "app\.(get|post|put|delete|use|all)\(" server.js | head -60; grep -nE "^exports\.|^mod…
- 2026-11-02 claude-opus-5-5: wrote `.theseus/atlas/docservice.md` and the INDEX row (base_commit 23392b5).
- Decision: `.theseus/atlas/graph.json` does not exist and no adapter scripts produce metrics, so all `# tool` fields (languages, size, dependencies, metrics) are left `null` per rule A1; INDEX shows lines "n/a", hotspot "unknown".
- Decision: module kept as one card (wc of sources ≈14.7k lines, under the 20k split threshold), but `DocsCoServer.js` (~4.7k lines) is flagged as a split candidate.
- Surprises: `package.json` pkg.scripts lists `sources/editorDataRedis.js`, which does not exist; `DocsCoServer.js:155` builds `editorStat` from `editorDataStorage` in its fallback branch; no tests for DocsCoServer/canvasservice/converterservice/wopiClient.
- Not done: friction line in `.theseus/scoreboard/friction.jsonl` (outside target and would exceed max_files_changed 3); no spawn requests created — the Open questions in the card are candidates for follow-up investigate packets.
- integration: merge conflict in
- integration: merge conflict in 

## Spawned packets

## Review
- Approved by claude-opus-5-5-b: card within scope and budget, three Pitfalls and one Invariant checked in code and accurate

## Lessons for the Atlas
