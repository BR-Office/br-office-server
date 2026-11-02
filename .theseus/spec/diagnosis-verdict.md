# Specification: Diagnosis Verdict

> Version 0.2 (draft). Part of the Theseus open specification. [Português](pt-BR/diagnosis-verdict.md)
> Location in a project: `.theseus/spec/diagnosis-verdict.md`

## 1. Purpose

**Diagnosis** decides what to do with each module and in what order. It is the phase that turns the map (Atlas) into a work plan (packet queue).

Each module gets a **verdict** with justification, evidence and an initial packet plan. Together, the verdicts form the **diagnosis summary**, which organizes the project into waves.

## 2. Possible verdicts

| Verdict | When | Typical output |
|---|---|---|
| **keep** | Works, is stable, is not a hotspot. Touching it only adds risk. | No packets. Reassess under defined conditions. |
| **refactor** | Worth improving structure or performance in the same language. | `refactor` packets. |
| **migrate** | Worth changing language while preserving behavior. Requires a target language. | `interop` packets, then `migrate`, from the leaves toward the center of the graph. |
| **rewrite** | The current design hurts more than it helps; only the external contract is kept. | `rewrite` packets, usually behind an interface. |
| **retire** | Dead or unused code. | An `investigate` packet to confirm it is unused, then removal. |

## 3. Core rules

| # | Rule | Why |
|---|---|---|
| D1 | **No oracle, no big change.** `migrate` and `rewrite` require a `partial` or `good` oracle. With oracle `none`, the verdict is conditional and the first packet is `characterize`. | Equivalence cannot be proven without a reference. |
| D2 | **Evidence before opinion.** Every scored criterion cites a card metric or a piece of code. | Makes the verdict auditable. |
| D3 | **Double diagnosis for expensive decisions.** `migrate` and `rewrite` are diagnosed by two models from different families, neither seeing the other's result. If they disagree, a human decides. | These are the most expensive and hardest decisions to undo. |
| D4 | **Every verdict says what would change it.** | Allows reassessment by criteria, not by impression. |
| D5 | **Keep is a valid answer.** The diagnostician is not rewarded for proposing work. | Avoids the rewrite-everything bias. |

## 4. The criteria matrix

Each criterion gets a score from 0 to 5. The **weights come from the adapter**, because each project has different goals (security, performance, ease of hiring).

| Criterion | What it measures | Sources |
|---|---|---|
| **Performance gain** | How much the module weighs in profiling and how much there is to gain. | `metrics.cpu_pct`, hotspots |
| **Security risk** | Manual memory management, parsing of untrusted input, history of flaws. | Code, bug history |
| **Maintenance cost** | High churn, complexity, knowledge concentrated in few people. | `churn_90d`, card |
| **Coupling** | How many modules depend on it (fan-in) and on how many it depends (fan-out). | `dependencies` |
| **Oracle strength** | How well equivalence can be proven. | `oracle.level` |
| **Interop cost** | How hard it is for new and old code to coexist during the transition. | Module boundaries, adapter |
| **Target ecosystem** | Mature libraries and people who know the target language. | Adapter |
| **Goal alignment** | How much touching this module serves the project's stated goals. | Adapter |

The matrix guides; it does not decide on its own. The diagnostician may go against the score, as long as it explains why.

## 5. Verdict format

File `.theseus/diagnosis/DIAG-<module id with / replaced by ->.md`:

```markdown
---
id: DIAG-core-zip
module: core/zip
verdict: migrate
target_language: rust
confidence: medium            # high | medium | low
conditional_on: null          # e.g. "PKT-0031 (characterize) done"
diagnosed_by: [claude-opus-5-5, gpt-x]
agreement: full               # full | partial | divergent (→ human)
decided_by: null              # filled when a human breaks the tie
base_commit: 3f9a2c1
wave: 1
---

## Summary
Two or three sentences: the verdict and the main reason.

## Matrix
| Criterion | Score | Weight | Evidence |
|---|---|---|---|
| Security risk | 5 | 0.30 | parses ZIP from uploads; 3 CVEs in history |
| ... | | | |

## Discarded alternatives
Why not the other verdicts. E.g. "refactor: does not solve the memory risk".

## Path of change
For migrate or rewrite: the interop mechanism (FFI, WASM, separate
process), the order of submodules (leaves first) and when the old code
can be removed.

## Initial packet plan
A table for people, followed by the machine-readable block `theseus plan` turns into packets, wave by wave (wave N is planned once every packet of the earlier waves of the module is done):

```yaml
packets:
  - key: P1                     # unique in this plan
    wave: 0
    type: characterize          # packet type
    title: Characterize core/zip/reader.c
    files: []                   # target.files
    create_in: [tests/zip]      # target.create_in
    depends_on: []              # keys of this plan
    acceptance: []              # optional; default: the adapter's oracle commands
    allowed_commands: []        # optional
    goal: Pin the reader's behavior on the corpus, including truncated archives.
    context: The fuzz corpus is in tests/corpus/zip.
```

## Risks
What can go wrong and how we will notice.

## What would change this verdict
E.g. "if profiling shows less than 2% CPU after the core/io refactor,
downgrade to refactor".
```

## 6. Diagnosis summary and waves

`.theseus/diagnosis/SUMMARY.md` consolidates all verdicts and organizes the work into **waves**:

- **Wave 0 – Foundation:** `characterize` packets for modules that will change and lack a sufficient oracle, plus the `interop` bridges.
- **Wave 1 – Clear wins:** highest gain, lowest risk, leaves of the graph.
- **Next waves:** move toward the center of the graph, using what earlier waves taught.

The summary includes a table with the count per verdict, estimated packets and cost per wave, and the dependency map between waves. Each finished wave triggers a review of the next wave's verdicts: Diagnosis is a living document.

## 7. Links to the other specifications

- **Module card:** provides metrics, oracle and invariants; receives the verdict id.
- **Work packet:** the initial plan becomes packets in `pending/`, with `origin.type: diagnosis`.
- **Measurement:** reverted verdicts and the actual gain of migrated modules measure Diagnosis quality. The audit may propose adjusting the matrix weights.
