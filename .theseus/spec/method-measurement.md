# Specification: Method Measurement and Evolution

> Version 0.2 (draft). Part of the Theseus open specification. [Português](pt-BR/method-measurement.md)
> Location in a project: `.theseus/spec/method-measurement.md`

## 1. The core idea

The method is treated like software: **it has a version, produces telemetry on every use and evolves through experiments**.

Every executed packet produces two kinds of data:
- **Hard data**, collected automatically: cost, time, attempts, oracle results.
- **Friction**, reported by the agents themselves: what in the method hindered, was missing or was unneeded.

Periodically, an independent **audit session** reads this data, critiques the method and proposes changes. Each change is a hypothesis with a metric to confirm or refute it in the next audit.

```
use the method ──▶ telemetry + friction ──▶ audit ──▶ proposals (TEP)
      ▲                                                    │
      └──── new method version ◀── human approval ◀────────┘
```

Method change proposals are called **TEPs** (Theseus Enhancement Proposals).

## 2. Principles

| # | Principle | Why |
|---|---|---|
| M1 | **Separate the work result from the method's effectiveness.** A packet can succeed despite the method, or fail because of it. | It is the method we are measuring, not only the code. |
| M2 | **Whoever audits neither executes nor changes.** The audit proposes; a human approves. | Prevents the system from grading and fixing itself unchecked. |
| M3 | **Every change is a measurable hypothesis.** No proposal is accepted without saying which metric should improve and by how much. | Otherwise there is no way to know if the change helped. |
| M4 | **At most two changes per version.** | With many changes at once, you cannot tell which caused the effect. |
| M5 | **Metrics in balancing pairs.** Speed always next to quality; cost always next to escaped regressions. | Prevents optimizing one number by worsening another (Goodhart's law). |
| M6 | **Minimum sample.** The audit concludes nothing about a rule affected by fewer than 20 packets; it records an "observation" instead. | Avoids changing the method because of one isolated case. |

## 3. Method versioning

- File `.theseus/VERSION` with the current version (e.g. `0.3.0`).
- Every packet records in the Scoreboard the method version it ran under.
- `.theseus/METHOD-CHANGELOG.md` lists each version, the TEPs it incorporated and each one's hypothesis.
- **Core vs adapter:** changes to the general specifications bump the method version; changes only to a project's adapter bump the adapter version. This separates what applies to every project from what applies to one.
- A tooling change that alters the packet flow bumps the method patch version (TEP-0001). Each record also carries `tool_version`, the Theseus CLI version that ran the packet.

## 4. What is measured

### 4.1 Per packet (extends the work packet Scoreboard record)

Each line of `.theseus/scoreboard/packets.jsonl` gains these fields. The factory writes every one of them on every record; an unknown value is `null`, never omitted (TEP-0001). `block_reason` of a blocked packet is `{"cause": "method" | "model" | "task", "ref": "<rule or section>", "text": "..."}` (TEP-0002); the routing statistics leave out blocks caused by the method, and the audit reports their cost separately. The factory fills in (TEP-0004): `estimated` (the packet's `estimated`, or its budget limits with `source: budget`), `context_ratio` (the largest context of one model call over the model's context window, from the tool's per-call usage), `flaky_oracle` (the same commit failed and then passed an acceptance command); `out_of_context_reads` stays `null` until a tool reports file reads.

```json
{
  "method_version": "0.3.0",
  "adapter_version": "0.2.0",
  "estimated": {"files": 4, "diff_lines": 600},
  "actual": {"files": 6, "diff_lines": 812},
  "context_ratio": 0.31,
  "out_of_context_reads": 7,
  "spawned_packets": 2,
  "approved_first_review": false,
  "rejection_reasons": ["contract_violated"],
  "block_reason": null,
  "flaky_oracle": false
}
```

### 4.2 Escapes (the most valuable data)

An **escape** is a problem that passed the oracle and the review and only showed up later. Each one becomes a line in `.theseus/scoreboard/escapes.jsonl`:

```json
{"id":"ESC-0009","packet":"PKT-0042","found_on":"2026-11-14","found_by":"integration test","severity":"high","failed_component":"oracle","note":"corpus had no ZIP64"}
```

The `failed_component` field says which part of the method let it through: `oracle`, `review`, `contract`, `atlas` or `diagnosis`.

### 4.3 Friction (the agents' report)

When a packet ends (done, blocked or discarded), the executor and the reviewer answer three short questions, always pointing to the rule or specification section involved. Stored in `.theseus/scoreboard/friction.jsonl`:

```json
{"packet":"PKT-0042","role":"executor","model":"claude-opus-5-5","date":"2026-11-02","hindered":{"ref":"packet#R1","text":"the 40% limit made me drop a card I needed"},"missing":{"ref":"atlas/card","text":"card did not say who calls the function"},"unneeded":null}
```

Answers are short and tied to a rule, so the audit can count, not just read. Every line has `packet`, `role`, `model`, `date` and at least one of `hindered`, `missing`, `unneeded` or `helped`, each an object with `ref` and `text` (or `null`). `theseus validate` rejects any other shape (TEP-0003).

### 4.4 Method indicators (computed by the audit)

Each indicator answers a question about one part of the method and is shown next to its pair (principle M5).

| Part | Question | Indicator | Balancing pair |
|---|---|---|---|
| Packet | Are packets well sliced? | Estimated vs actual deviation; spawned packets per packet | Escapes per packet |
| Atlas | Is the delivered context enough? | Out-of-context reads per packet; "missing" friction tied to the Atlas | Average context size (% of window) |
| Oracle | Does the oracle catch errors? | Escapes with `failed_component: oracle`; flakiness rate | Acceptance run time |
| Review | Does cross review add value? | Rejections that prevented real problems; escapes with `failed_component: review` | Review cost and time |
| Diagnosis | Do verdicts hold? | Reverted verdicts (e.g. "migrate" that became "keep") | Measured gain in migrated modules |
| Factory | Does the flow move? | Packets done per day; time stuck in each state | First-review approval rate |
| Routing | Do the right model and effort get the right packet? | Cost and approval per model, effort, packet type and language | Escapes per model and effort |

## 5. The audit session

### When it runs

- Every 50 finished packets, or
- at the end of each phase (Atlas, Diagnosis, Factory), or
- when an indicator crosses an alarm defined in the adapter (e.g. more than 2 high-severity escapes in a week).

The audit can be scheduled to run on its own, since it only reads repository files.

### Who audits

- A new session, with no execution history.
- Preferably from a model family different from the one that executed most packets in the period.
- Optional and recommended: **double audit**. Claude and GPT audit separately and a third step compares both reports. Points where both agree take priority.

### What it receives

1. The current specifications and `METHOD-CHANGELOG.md`.
2. The period's Scoreboard (`packets`, `escapes`, `friction`).
3. The previous audit report and the TEPs under test.

### What it delivers

A report `.theseus/audits/AUD-<number>.md` with:

1. **Period scoreboard:** the indicators of section 4.4, compared with the previous audit.
2. **Verdict on hypotheses under test:** for each TEP applied in the current version, whether it was confirmed, refuted or still lacks data.
3. **Findings:** each with evidence (packet, escape or friction ids) and the part of the method involved.
4. **Proposals (TEPs):** at most five, ordered by expected impact.
5. **What not to change:** rules the data shows are working, to avoid unnecessary changes.

## 6. Theseus Enhancement Proposal (TEP)

Each proposal is a file `.theseus/proposals/TEP-<number>.md`:

```markdown
---
id: TEP-0007
title: Raise the context limit to 50%
origin: AUD-003
component: packet     # packet | atlas | oracle | review | diagnosis | factory | routing
target: packet#R1
status: proposed      # proposed | approved | testing | confirmed | refuted | rejected
---

## Problem
What the data shows, with evidence (ids).

## Proposed change
The exact text to change in the specification.

## Hypothesis
"Raising the context limit from 40% to 50% cuts out-of-context reads by at
least 30% without increasing first-review rejections."

## How to verify
Indicators, expected values and minimum sample.

## Risks
What may get worse and which indicator will show it.
```

Cycle: `proposed → approved (human) → testing (new version) → confirmed or refuted (next audit)`. A refuted TEP is reverted in the next version, and the record stays in history as learning.

## 7. Base prompt for the audit session

The auditor prompt is in `.theseus/prompts/auditor.md` (installed by `theseus init`). In short: read the specifications, the previous audit, the TEPs under test and the Scoreboard; compute the indicators in pairs; give a verdict on each TEP with numbers; list findings only with evidence; propose at most five TEPs; say what must not change; and be critical, because the goal is to improve the method, not to defend it.

## 8. Cross-project learning (optional)

Since the method is freely distributed, each project may choose to publish its aggregated, anonymized indicators: no code, no file names, only numbers per packet type, language and model. With several projects contributing:

- core TEPs get validated on more than one codebase;
- a public benchmark of models on real refactoring and migration emerges;
- anyone starting a new project begins with calibrated model routing.

## 9. Rollout checklist

- [ ] `.theseus/VERSION` and `.theseus/METHOD-CHANGELOG.md` exist.
- [ ] Scoreboard records include the fields of section 4.1.
- [ ] Friction collection is part of the delivery and review protocol.
- [ ] The adapter defines the alarms that trigger an extra audit.
- [ ] The first audit is scheduled after the first 50 packets.
