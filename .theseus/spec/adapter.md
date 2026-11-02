# Specification: Adapter

> Version 0.2 (draft). Part of the Theseus open specification. [Português](pt-BR/adapter.md)
> Location in a project: `.theseus/spec/adapter.md`

## 1. Purpose

The method is the same for every project. The **adapter** is everything that changes from one project to another: languages, build commands, what serves as the oracle, which models are available and what the goals are.

Principle: **no core specification mentions a specific language, tool or model.** All of that lives here. If a core rule only makes sense for one kind of project, it belongs in the adapter.

## 2. Structure

```
.theseus/adapter/
  adapter.yaml          main configuration (section 3)
  VERSION               adapter version (separate from the method version)
  oracle.md             how the oracle works in this project
  interop-<pair>.md     bridge patterns between languages (e.g. interop-cpp-rust.md)
  conventions.md        code style and local rules
  scripts/              commands used by the method (graph, metrics, oracle)
```

The repository's root `AGENTS.md` points to the core (`.theseus/spec/`) and to this adapter. It is the single source of rules; `CLAUDE.md` only imports it.

## 3. The `adapter.yaml` file

```yaml
project:
  name: suite-docs
  description: Collaborative document editing suite (fork)
  repository: github.com/example/suite-docs
  upstream:                       # forks only (moving-target mode)
    repository: github.com/original/suite-docs
    branch: main
    sync_every: 7d

goals:                            # diagnosis matrix weights (sum to 1.0)
  weights:
    performance_gain: 0.20
    security_risk: 0.30
    maintenance_cost: 0.15
    coupling: 0.05
    oracle_strength: 0.10
    interop_cost: 0.10
    target_ecosystem: 0.05
    goal_alignment: 0.05
  statement: >
    Reduce memory risk in file processing and make it easier for new
    contributors to join.

languages:
  present: [cpp, javascript, typescript]
  allowed_targets:                # diagnosis may only propose these migrations
    cpp: [rust]
    javascript: [typescript]

tools:                            # mechanical facts (Atlas rule A1)
  graph: .theseus/adapter/scripts/build-graph.sh
  metrics:
    profiling: .theseus/adapter/scripts/profiling.sh
    churn: .theseus/adapter/scripts/churn.sh
    coverage: .theseus/adapter/scripts/coverage.sh
  hotspot:                        # rule to classify high/medium/low
    high: "cpu_pct >= 5 or (churn_90d >= 30 and coverage < 0.5)"
    medium: "cpu_pct >= 1 or churn_90d >= 10"

build:
  compile: make all
  test: make test
  environment: docker compose -f .theseus/adapter/docker-compose.yml

oracle:
  type: corpus                    # tests | corpus | replay | golden | mixed
  description: .theseus/adapter/oracle.md
  commands:
    diff: .theseus/oracle/diff-corpus.sh
    benchmark: .theseus/oracle/bench.sh
  tolerances:
    pixel_diff_pct: 0.0
    max_benchmark_regression_pct: 0

models:                           # context_window: used by packet rule R1
  - id: claude-opus-5-5
    family: anthropic
    tool: claude-code
    context_window: 200000
    roles: [cartographer, diagnostician, executor, reviewer, auditor]
  - id: claude-sonnet-5-5
    family: anthropic
    tool: claude-code
    context_window: 200000
    roles: [executor, reviewer]
  - id: gpt-x
    family: openai
    tool: codex
    context_window: 200000
    roles: [cartographer, diagnostician, executor, reviewer, auditor]

initial_routing:                  # replaced by Scoreboard data over time
  migrate: [claude-opus-5-5, gpt-x]
  refactor: [claude-sonnet-5-5, gpt-x]
  characterize: [claude-sonnet-5-5]

review:
  allow_same_family: false       # pilot mode: true lets another model of the same family review (rule R4 exception)

routing:                          # who executes and reviews, and how much they think
  mode: auto                      # auto: the Scoreboard decides once it has data | static
  min_samples: 5                  # packets per (model, effort, packet type) before trusting the data
  explore: 0.15                   # share of packets that try the least known option

effort:                           # reasoning effort: low | medium | high | xhigh | max
  levels: [low, medium, high]     # options the Scoreboard may try
  default: low                    # executors and reviewers, until the Scoreboard knows better
  planning: high                  # planning work: cartographer, diagnostician, auditor, investigate packets
  by_type: {}                     # optional starting effort per packet type, e.g. {migrate: medium}

limits:
  max_context_ratio: 0.40         # packet rule R1
  abandon_after_hours: 2
  max_cost_per_packet_usd: 5.00
  stale_card_ratio: 0.10          # Atlas freshness rule
  max_parallel_agents: 6
  agent_timeout_min: 60          # factory: per agent run and acceptance command

audit:
  every_n_packets: 50
  alarms:
    - "high_severity_escapes_7d > 2"
    - "first_review_approval_30d < 0.5"

shared_telemetry: false           # opt-in for cross-project learning
```

Each model declares how the factory starts it (`tool`):

| `tool` | Command used by `theseus run` |
|---|---|
| `claude-code` | `claude -p <prompt> --model <model_name> --output-format json --permission-mode acceptEdits --effort <effort>` |
| `codex` | `codex exec --sandbox workspace-write -c approval_policy="never" [-m <model_name>] -c model_reasoning_effort=<effort> -C <worktree> -o <file> <prompt>` |
| `command` | Any program, from `command`, with the placeholders `{prompt_file}`, `{workdir}` and `{model}` |

Optional fields: `model_name` (name passed to the tool; Claude Code defaults to the `id`, Codex without it uses its own default model) and `args` (extra arguments, e.g. tool permissions). `limits.agent_timeout_min` limits each agent run and each acceptance command (default 60).

### Routing and reasoning effort

The factory chooses, for every packet, **which model** executes and reviews it and **how much it thinks** (reasoning effort). Each pair (model, effort) is an option. With `routing.mode: auto`:

1. **Not enough data** (fewer than `min_samples` packets for an option in that packet type): the static routing applies, `initial_routing` for the model and `effort.default` for the effort (`low`), except planning work (`effort.planning`, `high`: cartographer, diagnostician, auditor and `investigate` packets).
2. **With data**, the Scoreboard decides. Executor quality per packet: 1 when approved at the first review, 0.5 when approved later, 0 when blocked, minus 1 per escape. Reviewer quality: 1, or 0 when an escape was blamed on the review. The option with the best quality wins; options within 5 points of the best are decided by the **lowest average cost**, so more effort is only used when it buys quality.
3. **Exploration:** a share of packets (`explore`, 15%) tries the least known option, so the method keeps learning. The choice is deterministic per packet.

`theseus run --dry-run` shows each choice and its reason. Every scoreboard record stores `executor_effort`, `reviewer_effort`, the costs of each role and how the choice was made (`routing`).

## 4. The project oracle (`oracle.md`)

The most important adapter document, because it defines what counts as proof. It must answer:

1. **What is the reference?** Tests, a corpus of real inputs, recorded traffic for replay, reference outputs.
2. **How is it compared?** Exact equality, structural diff, image diff, numeric tolerance.
3. **What is noise?** Dates, random ids, non-deterministic order, and how they are neutralized.
4. **Where are the known gaps?** So Diagnosis and `characterize` packets know where to reinforce.
5. **How much does it cost to run?** Time of the full oracle and of a quick per-module version.

Typical oracles by kind of system:

| Kind of system | Typical oracle |
|---|---|
| Document suite | Corpus of real files; compare conversions and renderings |
| ERP / transactional system | Replay of recorded transactions; compare final database state |
| Compiler / interpreter | Program suite; compare output and generated code |
| Graphics engine / game | Reference scenes; compare rendered frames |
| API / service | Recorded traffic; compare responses, ignoring volatile fields |

## 5. Interop patterns (`interop-<pair>.md`)

One file per language pair allowed in `allowed_targets`. Each describes:

- The bridge mechanism (FFI, WASM, separate process, queue).
- How types, errors and memory cross the boundary.
- A minimal working example in the repository itself.
- Known pitfalls.

These files are reusable across projects and are good candidates for community contributions.

## 6. Installing the method in a new project

1. `theseus init` creates `.theseus/` with the core specifications and `AGENTS.md` at the root.
2. Fill in `adapter.yaml` and `oracle.md`. A model may draft them from the repository, but a human reviews the goals and weights.
3. Implement the `tools` scripts and run them: graph and metrics.
4. `theseus validate` until there are no errors (section 7).
5. Follow the flow: **Atlas → Diagnosis → Oracle → Factory → Scoreboard**.

## 7. Adapter validation

`theseus validate` checks:

- [ ] The `goals` weights sum to 1.0.
- [ ] At least two model families have the reviewer role (packet rule R4).
- [ ] There is an `interop-<pair>.md` for each allowed migration.
- [ ] `AGENTS.md` points to `.theseus/`.
- [ ] With `--run`: every `build` and `oracle` command runs without errors.

The oracle must also be stable: run twice on the same code, it gives the same result.

## 8. Versioning

- The adapter has its own version (`.theseus/adapter/VERSION`), recorded in every packet.
- Adapter changes follow the same TEP cycle as the measurement specification, marked `scope: adapter`.
- When an adapter change proves useful in several projects, it is a candidate to move into the core.
