---
id: PKT-0008
title: Second, independent diagnosis of the DocService package (rule D3)
type: investigate
priority: high
module: docservice

origin:
  type: human
  ref: null

depends_on: []

target:
  files: []
  create_in: [.theseus/diagnosis/]

context:
  cards: [docservice]
  references:
    - .theseus/prompts/diagnostician.md
    - .theseus/spec/diagnosis-verdict.md
    - .theseus/adapter/adapter.yaml
    - .theseus/adapter/oracle.md
    - DocService/sources/

contract:
  preserve:
    - "No source code or test changes: this packet only writes the verdict"
  forbidden:
    - Common/**
    - DocService/**
    - tests/**

acceptance:
  commands:
    - "test -f .theseus/diagnosis/DIAG-docservice-b.md"
    - "theseus validate"

budget:
  max_files_changed: 1
  max_diff_lines: 250
  max_cost_usd: 3.00
  max_attempts: 2

roles:
  executor: claude-sonnet-5-5
  reviewer: claude-opus-5-5
---

## Goal
Rule D3: write a **second, independent** verdict for the `DocService` package in `.theseus/diagnosis/DIAG-docservice-b.md` (`id: DIAG-docservice-b`), following `.theseus/spec/diagnosis-verdict.md` and `.theseus/prompts/diagnostician.md`.

## Essential context
- **Do not open `.theseus/diagnosis/DIAG-docservice.md` or any other DIAG file**, and do not read the packets that produced them: the value of this diagnosis is that it is independent. Work only from the Atlas card `.theseus/atlas/docservice.md`, the adapter, the oracle notes and the source code.
- Same rules as any verdict: score all 8 criteria with evidence (D2), `keep` is a valid answer (D5), `migrate`/`rewrite` with oracle `none` must be conditional (D1). Allowed migration: JavaScript to TypeScript 7 (see `.theseus/adapter/interop-javascript-typescript.md`).
- Set `diagnosed_by: [claude-sonnet-5-5]` and `agreement: partial`. A human or the Integrator compares both verdicts afterwards.
- Include the initial packet plan in waves, with target files.

## Executor log

## Spawned packets

## Review
- Approved by claude-opus-5-5: Complete, evidence-backed conditional migrate verdict that respects D1/D2/D5, with scope and budget respected

## Lessons for the Atlas
