---
id: PKT-0020
title: "Is DocService database.js dead code?"
type: investigate
priority: low
module: docservice

origin:
  type: diagnosis
  ref: DIAG-docservice

depends_on: []

target:
  files:
    - ".theseus/atlas/docservice.md"
  create_in: [".theseus/atlas"]

context:
  cards: [docservice]
  references: [.theseus/adapter/interop-javascript-typescript.md]

contract:
  preserve:
    - "No source code changes"
  forbidden: []

acceptance:
  commands: []

budget:
  max_files_changed: 2
  max_diff_lines: 300
  max_cost_usd: 3.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: claude-sonnet-5-5
---

## Goal
Confirm whether `DocService/sources/database.js` is dead code (unused, cannot load), and why `DocService/package.json` `pkg.scripts` lists the absent `editorDataRedis.js`.

## Essential context
- DIAG-docservice P7 proposes retiring `database.js`: it needs `mongodb` and `./config.json`, and nothing requires it.
- Check every `require` path in the repository (including scripts, Gruntfile, Makefile, Docker files), not only `DocService/sources`.
- Output: the finding in the DocService Atlas card, and spawned packets with `theseus packet new` for any removal or `pkg.scripts` fix (one per change). Do not remove anything here.

## Suggested plan
1. Search for references.
2. Try loading the module in isolation and record the error.
3. Update the card and spawn packets.

## Executor log

## Spawned packets

## Review
- Approved by claude-sonnet-5-5: Evidence verified, and the finding and caveats are recorded in the card. The four proposed packets still need creating.

## Lessons for the Atlas
