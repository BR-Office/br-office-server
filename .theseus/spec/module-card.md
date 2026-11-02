# Specification: Module Card (Atlas)

> Version 0.2 (draft). Part of the Theseus open specification. [Português](pt-BR/module-card.md)
> Location in a project: `.theseus/spec/module-card.md`

## 1. Purpose

The **Atlas** is the map of the system. It lets an agent understand a codebase of millions of lines without reading all the code. The Atlas has three parts:

| Part | File | Produced by |
|---|---|---|
| **Index** | `.theseus/atlas/INDEX.md` | Generated from the cards |
| **Graph** | `.theseus/atlas/graph.json` | Tools (never a model) |
| **Module cards** | `.theseus/atlas/<module path>.md` | Cartographer model, verified by another model |

The card is the entry point of every packet: the executor reads the listed cards before opening any code.

## 2. Core rules

| # | Rule | Why |
|---|---|---|
| A1 | **Mechanical facts come from tools, interpretation comes from models.** Dependencies, sizes, churn, coverage and hotspots are computed by tools. The model only writes what requires understanding. | Models get wrong facts that a tool always gets right. |
| A2 | **The card is short.** At most 800 words in the body. | Several cards must fit in a packet context (rule R1). |
| A3 | **Every claim has an origin.** Interpretive claims are tagged `[model]`, `[human]` or `[verified]`. | The reader knows what to trust. |
| A4 | **The card knows its age.** It records the commit it was based on and is marked stale when the code changes beyond a threshold. | Essential when the original project keeps changing. |
| A5 | **The card learns.** Every finished packet returns its lessons to the module card. | The map improves with every use. |

## 3. Granularity: what is a module

- A unit with a clear boundary: a library, a package, a directory with its own responsibility.
- **Target size:** 2,000 to 20,000 lines.
- Above that, the module is split into submodules. The parent card becomes an **index card**: only responsibility, list of submodules and how they relate.
- Below 2,000 lines, tightly coupled modules may share one card.

## 4. Header (frontmatter)

Fields marked `# tool` are filled in automatically and never edited by hand.

```yaml
---
id: core/zip
title: Reading and writing ZIP files
kind: module                      # module | index
parent: core                      # index card above (if any)
paths: [core/zip/]
languages: {cpp: 0.92, c: 0.08}   # tool
size: {files: 31, lines: 8420}    # tool

base_commit: 3f9a2c1              # commit the card was written/reviewed against
updated_at: 2026-11-01
updated_by: claude-opus-5-5
verified_by: gpt-x                # model that checked the sample (section 7)
freshness: current                # current | stale (tool)

dependencies:                     # tool, from the graph
  uses: [core/io, core/crypto]
  used_by: [core/x2t, server/converter]
  fan_in: 14
  fan_out: 3

metrics:                          # tool
  cpu_pct: 6.1                    # share of the reference profile
  churn_90d: 47                   # commits in the last 90 days
  coverage: 0.38
  hotspot: high                   # high | medium | low (adapter rule)

oracle:
  level: partial                  # none | partial | good
  sources: [unit tests, document corpus]

verdict: DIAG-core-zip            # when there is one
---
```

## 5. Card body

Always the same sections, in this order. Empty sections say "nothing known" instead of being deleted.

```markdown
## Responsibility
Two sentences: what the module does and what it does NOT do.

## Entry points
The functions, classes or endpoints through which the rest of the system
uses the module. With path and a one-line description each.

## Main flow
How the module works, in up to 8 steps.

## Invariants
Rules that must never break. E.g. "never aborts on a corrupted file;
always returns an error". They are the basis of the packets' `contract`.

## Pitfalls
What surprises newcomers: side effects, global state, initialization
order, inherited behavior that looks like a bug but is relied upon.

## Hotspots
The parts that show up in profiling, with the likely cause of the cost.

## Available oracle
How to prove a change here broke nothing, and where the gaps are.

## Open questions
Unanswered questions. Each one should become an `investigate` packet.

## Lessons
Learnings from finished packets, with the source id. E.g.:
"[PKT-0042] the corpus had no ZIP64 files; added."
```

## 6. Atlas index

`.theseus/atlas/INDEX.md` is the first thing any agent reads in the project. One line per module, generated from the cards:

```markdown
| Module | Responsibility (1 line) | Lines | Hotspot | Oracle | Verdict | Freshness |
|---|---|---|---|---|---|---|
| core/zip | Reads and writes ZIP | 8,420 | high | partial | migrate → rust | current |
```

The whole index must fit in 10% of the window of the smallest enabled model. If it does not, the index lists only first-level index cards.

## 7. How cards are produced

1. **Tools first.** The adapter runs the mechanical tools and generates `graph.json` and the metrics.
2. **Slicing.** The graph and sizes define the modules (section 3).
3. **Parallel cartography.** Each module becomes an `investigate` packet whose result is the card. Several agents, of different models, work at the same time.
4. **Sample verification.** A model from another family picks 3 claims from the card (preferably from Invariants and Pitfalls), checks them in the code and tags each `[verified]` or corrects it. If more than one is wrong, the card goes back to the Cartographer.
5. **Publication.** The index is regenerated.

## 8. Freshness and updates

- A tool compares `base_commit` with the current state of the module `paths`.
- The card becomes `stale` when lines changed since the base exceed the adapter threshold (default: 10% of the module) or when an entry point changes signature.
- A stale card automatically generates an `investigate` update packet that reads **only the diff** since the base, not the whole module.
- Packets that depend on a stale card are blocked until it is updated.

## 9. Links to the other specifications

- **Work packet:** `context.cards` points to cards; the `contract` comes from Invariants; packet lessons come back here.
- **Diagnosis:** the verdict uses the card metrics and oracle level.
- **Measurement:** out-of-context reads and "missing" friction tied to the Atlas measure card quality.
