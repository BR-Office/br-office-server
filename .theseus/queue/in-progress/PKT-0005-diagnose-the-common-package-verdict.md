---
id: PKT-0005
title: Diagnose the Common package (verdict)
type: investigate
priority: high
module: common

origin:
  type: human
  ref: null

depends_on: []

target:
  files: []
  create_in: [.theseus/diagnosis/]

context:
  cards: [common]
  references:
    - .theseus/prompts/diagnostician.md
    - .theseus/spec/diagnosis-verdict.md
    - .theseus/adapter/adapter.yaml
    - .theseus/adapter/oracle.md
    - Common/sources/

contract:
  preserve:
    - "No source code or test changes: this packet only writes the verdict"
  forbidden:
    - Common/**
    - DocService/**
    - tests/**

acceptance:
  commands:
    - "test -f .theseus/diagnosis/DIAG-common.md"
    - "theseus validate"

budget:
  max_files_changed: 1
  max_diff_lines: 250
  max_cost_usd: 3.00
  max_attempts: 2

roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Act as the Diagnostician: write the verdict `.theseus/diagnosis/DIAG-common.md` for the `Common` package, following `.theseus/spec/diagnosis-verdict.md` and `.theseus/prompts/diagnostician.md`.

## Essential context
- Read the Atlas card `.theseus/atlas/common.md` first; open source files only to back up a score with evidence (rule D2).
- The adapter weights favor maintenance cost (0.25), security risk (0.20) and oracle strength (0.15). The only allowed migration is JavaScript → TypeScript.
- Oracle today: unit tests via `.theseus/oracle/unit.sh` (see `oracle.md`). `utils.js` now has characterization tests for 18 pure helpers (PKT-0002).
- Keep is a valid answer (rule D5). If the verdict is `migrate` or `rewrite` and the oracle level is `none` for the part being changed, the verdict must be conditional (`conditional_on`) and the first planned packet must be `characterize` (rule D1).
- Set `diagnosed_by: [claude-opus-5-5]`; a second, independent diagnosis by another model will follow for expensive verdicts (rule D3), so set `agreement: partial` until then and do not read any other DIAG file.
- The verdict may apply different decisions to submodules (for example: migrate the pure helpers, keep the queue adapters). Say so in "Path of change" and in the initial packet plan, which must be concrete: type, target files, one-line goal and dependencies for each packet, in waves (wave 0 = characterize/interop first).

## Suggested plan
1. Read the card, the adapter, the oracle notes and the spec.
2. Score every matrix criterion 0–5 with evidence.
3. Choose the verdict, write the alternatives discarded, the path of change, the initial packet plan (5 to 10 packets), the risks and what would change the verdict.
4. Run the acceptance commands.

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
