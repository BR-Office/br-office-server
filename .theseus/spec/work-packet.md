# Specification: Work Packet

> Version 0.2 (draft). Part of the Theseus open specification. [Português](pt-BR/work-packet.md)
> Location in a project: `.theseus/spec/work-packet.md`

## 1. Purpose

A **work packet** is the smallest unit of work in the method and the contract between agents. Any model (Claude, GPT or another) must be able to take a packet, execute it without anything else from a conversation, and deliver a verifiable result.

A well-written packet answers five questions:

1. **What?** The goal and the target files.
2. **With what context?** Which Atlas cards and references to read.
3. **What must not change?** The contract to preserve.
4. **How do we prove it worked?** Acceptance by the oracle.
5. **How far to go?** The scope and cost budget.

## 2. Core rules

| # | Rule | Why |
|---|---|---|
| R1 | **Fits in one context.** Context cards plus target files must take at most 40% of the window of the smallest enabled model. | Leaves room for reasoning, tests and fixes. |
| R2 | **Scope never expands.** If the executor finds work outside the target, it creates a new packet instead of doing it. | Prevents the domino effect. |
| R3 | **Nothing is accepted without proof.** Acceptance is decided by the oracle commands, never by the model's opinion. | Makes the result auditable. |
| R4 | **Reviewer from another family.** The reviewer must belong to a different model family than the executor. In pilot mode (`review.allow_same_family: true` in the adapter) it may be another model of the same family, never the executor itself. | Different models make different mistakes. |
| R5 | **No oracle, characterize first.** If the module lacks tests or a reference, the first packet is of type `characterize`. | You cannot refactor what you cannot measure. |
| R6 | **The packet is self-contained.** Nothing essential may live only in a conversation with a model. | Any agent can take over at any time. |

## 3. File format

- One Markdown file per packet, with a YAML header (frontmatter): readable by humans and scripts.
- Name: `PKT-<4-digit number>-<slug>.md`. Example: `PKT-0042-migrate-zip-reader.md`.
- The packet state is **the folder it is in** (see section 6). The state is not repeated inside the file, so they can never diverge.

## 4. Header (frontmatter)

```yaml
---
id: PKT-0042
title: Migrate the ZIP header reader from C++ to Rust
type: migrate             # see the table of types
role: executor            # optional: the role that executes it (executor by default; auditor, cartographer, diagnostician)
priority: high            # critical | high | medium | low
module: core/zip          # Atlas card id

origin:                   # where this packet came from
  type: diagnosis         # diagnosis | packet | upstream | human
  ref: DIAG-core-zip      # verdict id, parent packet or upstream commit

depends_on: [PKT-0038]    # can only start when these are in done/
blocks: [PKT-0051]

target:
  files:                  # the only files that may be modified
    - core/zip/header_reader.cpp
    - core/zip/header_reader.h
  create_in:              # paths where new files may be created
    - rust/zip_header/
  source_language: cpp
  target_language: rust

context:                  # what the executor reads before starting
  cards: [core/zip, core/io]
  references:
    - core/zip/zip_reader.cpp#L120-L180
  adapter_notes: .theseus/adapter/interop-cpp-rust.md

contract:                 # what must not change
  preserve:
    - "Public API of header_reader.h (signatures and semantics)"
    - "Behavior with corrupted files: returns an error, never aborts"
  forbidden:
    - core/zip/zip_writer.*

allowed_commands: []        # extra shell commands the executor may run (e.g. "npm install"); acceptance and git commands are always allowed

acceptance:               # run automatically; all must pass
  commands:
    - make test-zip
    - .theseus/oracle/diff-corpus.sh --module core/zip
  benchmark:
    command: .theseus/oracle/bench.sh zip_header
    limit: "time <= 100% of baseline"   # migration: must not get worse
  extra_criteria:
    - "No unsafe block without a justifying comment"

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3         # after 3 failed reviews, goes to blocked/
  timeout_min: null       # optional: minutes per agent run, overriding limits.agent_timeout_min

roles:                    # filled at claim / review time
  executor: null          # e.g. claude-opus-5-5 | gpt-x
  reviewer: null

rejected_reviews: 0       # maintained by `theseus move`
---
```

### Packet types

| Type | When to use |
|---|---|
| `characterize` | Create characterization tests, a corpus or a benchmark for a module without a sufficient oracle. |
| `investigate` | Answer a question (e.g. "is this module used in production?"). The deliverable is an Atlas update, not code. |
| `refactor` | Improve structure or performance in the same language. |
| `migrate` | Change language while preserving behavior. |
| `rewrite` | Replace the implementation with another approach, keeping the same external contract. |
| `interop` | Create or adjust the bridge between old and new code (FFI, WASM, IPC). |
| `port-upstream` | Bring a change from the original project into an already migrated module (moving-target mode). |

## 5. Packet body

The body always has the same sections. Whoever creates the packet fills in the first three; the rest is filled in during the work.

```markdown
## Goal
One or two sentences on the expected result and why.

## Essential context
The minimum the executor needs to know that is not in the cards.

## Suggested plan
Suggested steps. The executor may change the plan but must record why.

## Executor log
Decisions taken, surprises found, attempts that failed.

## Spawned packets
Work discovered outside the scope (rule R2), with the ids of the packets created. In a packet worktree, `theseus packet new` records a request in `.theseus/spawn/` (id `SPAWN`, `origin.type: packet`); when the packet is approved the factory gives each request the next free id, moves it to `pending/`, lists it here and removes the request from the branch. Agents in parallel never compete for an id.

## Review
Reviewer verdict: approved, or rejected with reasons.

## Lessons for the Atlas
What was learned and must go into the module cards.
```

## 6. Lifecycle

The state is the folder in `.theseus/queue/`. Every state change is a `git mv` with its own commit, which leaves an auditable history and works as a lock between agents.

```
pending/ ──claim──▶ in-progress/ ──deliver──▶ review/ ──approve──▶ done/
   ▲                    │                       │
   │                    ▼                       │ reject
   └──── release ── blocked/ ◀──────────────────┘ (back to in-progress/
                                                  up to max_attempts)
discarded/  ← packet that no longer makes sense (reason recorded)
```

The CLI implements the lifecycle: `theseus packet new`, `theseus claim` and `theseus move`.

### Claim protocol

1. Choose a packet in `pending/` whose `depends_on` packets are all in `done/` (highest priority first).
2. Fill in `roles.executor` and move it to `in-progress/` in a single commit: `claim: PKT-0042 by <model>`.
3. Push. **If the push is rejected**, another agent got there first: update from the remote and pick another packet.
4. Create the worktree and the branch `pkt/PKT-0042`.

`theseus claim --model <id> --push --worktree <dir>` does all four steps.

A packet released from `blocked/` starts over on a new branch. `theseus move PKT-0042 pending --reason "..." --resume` keeps the previous branch instead: the next claim merges the claim commit into it, and the executor continues from the previous attempt (if the merge conflicts, the packet starts over). Use it when the work was sound and the block came from the method or a missing permission.

### Abandonment

A packet in `in-progress/` with no commits on its branch for longer than the adapter limit (default: 2 hours) may be returned to `pending/` by the Integrator, with a record in the body.

### Delivery and review

1. The executor runs every `acceptance` command locally and only delivers if all pass.
2. Moves it to `review/` with the commit `deliver: PKT-0042`.
3. The reviewer (another family, rule R4) reruns the acceptance, reads the diff against the `contract` and records the verdict.
4. Approved: the Integrator merges and moves it to `done/`. The module card in the Atlas is updated with the **Lessons for the Atlas**.

### Factory (`theseus run`)

The CLI can run the whole cycle with parallel agents:

```bash
theseus run --agents 4            # 4 workers until no packet can be claimed
theseus run --dry-run             # shows which packets would run, with which models
```

For each packet, a worker claims it for an executor (adapter `initial_routing`, else round robin), creates the worktree `pkt/<id>` and runs the executor agent there. Then the factory itself, not the model, checks the result:

1. **Scope (R2):** only `target.files` and `target.create_in` may have changed. `"."` in `create_in` means files directly in the repository root, not in its subfolders. The packet itself (its executor log) and `.theseus/scoreboard/friction.jsonl` are always in scope.
2. **Acceptance (R3):** every `acceptance` command must pass.
3. **Review (R4):** a reviewer of another family must end its answer with `VERDICT: APPROVE` or `VERDICT: REJECT <reason>`.

A failure or rejection goes back to the executor with the reason, up to `budget.max_attempts`; after that the packet is blocked. Approved packets reach `done/` with cost, duration and diff size on the Scoreboard. Merging the `pkt/<id>` branches is left to the Integrator.

## 7. Scoreboard record

When a packet reaches `done/`, `blocked/` or `discarded/`, a line is appended to `.theseus/scoreboard/packets.jsonl`:

```json
{"id":"PKT-0042","type":"migrate","module":"core/zip","executor":"claude-opus-5-5","reviewer":"gpt-x","result":"done","attempts":1,"cost_usd":3.40,"diff_lines":512,"benchmark_delta":"-12%","duration_min":47,"date":"2026-11-01","method_version":"0.3.0"}
```

This data feeds routing: over time, Diagnosis suggests the best executor per packet type and language.

The full record fields, friction collection at the end of each packet and the escape log are in [method-measurement.md](method-measurement.md). Every record must include `method_version`.

## 8. Checklist for a good packet

- [ ] The goal fits in two sentences.
- [ ] Target files are listed explicitly.
- [ ] Context respects rule R1 (up to 40% of the window).
- [ ] The contract says what to preserve and what is forbidden.
- [ ] Every acceptance criterion is an executable command, or is clearly marked as an extra criterion for the reviewer.
- [ ] There is a scope and cost budget.
- [ ] Dependencies are declared.

## 9. Related specifications

- [Module card](module-card.md): where context and contract come from.
- [Diagnosis verdict](diagnosis-verdict.md): where packets are born.
- [Adapter](adapter.md): project commands, limits and models.
- [Method measurement](method-measurement.md): full scoreboard record, friction and escapes.
