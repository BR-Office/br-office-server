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

goals:
  statement: >                    # what the work must deliver; the diagnosis is judged against it
    Gain performance where users feel it, in quality (fewer defects) and speed,
    on the server or in the client.
  measure:                        # what the performance baseline measures (theseus plan plans it)
    - "Speed: latency and throughput of what users do (open, edit, save, convert)"
    - "Quality: defects, crashes and regressions"
  preferred_languages: [rust, go, typescript]   # first candidates for a migration

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

Optional fields: `model_name` (name passed to the tool; Claude Code defaults to the `id`, Codex without it uses its own default model) and `args` (extra arguments, e.g. tool permissions). `limits.agent_timeout_min` limits each agent run and each acceptance command (default 60). `factory.setup` is an optional command the factory runs in each new worktree before the executor starts, such as installing dependencies (`npm ci`). `factory.read_only_commands` lists read-only probes every agent may run without approval (for example `node --version`, `theseus status`).

`theseus plan` creates the packets of the next step from the state of the project, so nobody writes them by hand. First, the **performance baseline** (`.theseus/oracle/baseline.md`): what `goals.measure` asks, measured where users feel it, on the server or in the client, with the commands of `goals.baseline_commands` pre-approved (`["*"]` grants every privilege: no approval for any tool or path, for a disposable machine where the measurement must install and run the whole stack). Diagnoses wait for it. Every diagnosis and the baseline record `goals_hash`, a fingerprint of `goals`: when the goals change, the plan measures and diagnoses again, and discards the not-started packets of the old plans. `languages.allowed_targets: any` lets the diagnosis propose any language it justifies (`goals.preferred_languages` lists the first candidates). For each module in `modules` (`[{id, path, description}]`): an Atlas card packet (`role: cartographer`); then a diagnosis (`role: diagnostician`); for a `migrate` or `rewrite` verdict, an independent second diagnosis (rule D3) that the first diagnosticians may not execute (`exclude_executors`); then it compares the two verdicts and writes `agreement`, and a divergence waits for a person to fill in `decided_by` (and `plan_from` to follow the second plan); then the packets of the diagnosis plan, wave by wave. **Rounds:** once every packet of a module's plan has run (done, blocked or discarded) and no packet of the module is open, it plans the module's next round: a diagnostician measures the module again where users feel it (original against new, with the differential oracle and the commands of `goals.baseline_commands`), records the numbers in `.theseus/oracle/rounds/<module>-rN.md` (its own file: the rounds of all modules run in parallel), and replaces the diagnosis with `round: N`, judging what the earlier round delivered; its plan's packets get keys `plan:<module>:<hash>:rN:<row>`. The cycle continues until `goals.max_rounds` (no limit by default).

**Journeys (TEP-0013).** `goals.journeys` (`[{id, description, measure}]`) lists what users do, such as opening a document, typing or co-editing; `measure` is a command that runs the journey several times against the integrated build (the main branch and the forks' collecting branches, not the installed package) and prints `total_ms=<p50> min_ms=<min> max_ms=<max> runs=<n>`. With journeys, the rounds follow them: `theseus plan` first plans one packet per journey that maps it end to end into `.theseus/journeys/<id>.md` (header `round` and `total_ms`; a ```yaml block of `stages` with `id`, `module`, `files`, `functions`, `ms`, `share`, and `unattributed_ms`, adding up to `total_ms` within 5%); then every module is diagnosed again for that round and lists in its header every stage the maps give it, in `covers` or in `not_covered` with a reason, so the whole application is covered, not one part or another (`theseus validate` checks both). When every module has run its plan, the next round maps the journeys again. Journey maps are `exclusive`: they run alone, on a quiet machine, and nothing starts beside them. After every integrated change the factory waits for the running packets to finish, starts none, measures every journey and appends the result to `.theseus/scoreboard/journeys.jsonl`, printing the number before and now. It also plans the method audit when `audit.every_n_packets` records were added to the scoreboard since the last one (`role: auditor`). `theseus run --plan` alternates planning and execution until nothing is left to plan.

`environment.checks` (`{name: command}`) declares environment checks; a packet that lists a name in `requires` is blocked before any agent runs when its check fails (TEP-0002). `environment.start` (`{name: command}`, optional) says how to bring an environment up: when a check fails, the factory runs its start command once and checks again before blocking, so a machine restart does not stop the queue. Before each packet, the factory also runs every check and tells the executor and the reviewer which environments are up, with the command that proved it. `factory.require_friction` (default `true`) makes every executor add its own friction line for the packet (TEP-0004).

`.theseus/adapter/environment.md` (optional) describes what is installed and running for the project: services, container images and tools, and how to start them. The factory tells every agent to read it first.

A module may live in **another repository**: `modules[].repository` (a git URL) and optionally `checkout` (default `external/<name>`). The factory keeps a shallow mirror next to the worktrees and checks it out, read only, in every worktree at `checkout`; the checkout paths are excluded from the project's git, so nothing under them reaches a packet branch. With `modules[].fork` (a writable fork of `repository`) and `fork_branch` (default `theseus`), the packets of that module may change its code: the factory checks out the fork's branch on a branch `pkt/<id>`, counts the changes under the checkout path for the scope (rule R2), pushes `pkt/<id>` to the fork after every attempt, shows the diff to the reviewer, and on approval merges it into `fork_branch`, which every later checkout starts from. The factory creates `fork_branch` from the fork's default branch the first time. An `investigate` packet may prototype in its fork checkout: those changes are outside the scope check, and its branch is pushed for the record but never merged; a change worth keeping is requested as a refactor packet.

**Original against new.** Next to every fork checkout the factory puts the original code at `<checkout>.base` (the fork's default branch, that is, the upstream code), so an oracle can run the original and the new code on the same inputs. `modules[].oracle` (a list of commands) is the module's own oracle; for a packet of a forked module the factory adds to its acceptance the oracles of every module of that repository and, last, `.theseus/oracle/differential/<module>.sh` when it exists: the differential oracle, which compares the original and the new code on the same operations (open, edit, co-edit, save, convert) and prints the timing of both. Before the acceptance runs, the packet's branch is merged into the fork branch as it is then, so the oracles test the combination approval would produce; a conflict is a rejection the executor resolves. The reviewer sees the differential oracle's output, and for a performance goal rejects when the difference against the original is absent or zero. While a forked module has no differential oracle, `theseus plan` plans one packet per repository to build it. Commands get `THESEUS_CACHE_DIR`, shared by every worktree, to cache builds by commit. The factory also removes a packet's worktree once its branch is merged, and at every round the worktrees of done or discarded packets (blocked ones keep theirs, for `--resume`). It stops claiming when the disk has less than `factory.min_free_gb` free (default 5).

`theseus plan` also checks the main branch: when `factory.integrate_check` fails on it twice in a row, it plans one **repair** packet (priority `critical`, open target `create_in: ["**"]`), and nothing else can be claimed until it is done. Make `integrate_check` run every oracle command the packets' acceptance uses, so that what reaches the main branch keeps passing them.

`factory.integrate: true` makes the factory merge each approved branch into the main branch. Conflicts only in the files of `factory.union_merge` (e.g. `.gitignore`) keep both sides; `factory.integrate_check` (e.g. the unit oracle) runs on the merged tree before the merge commit. Any other conflict, or a failing check, leaves the branch unmerged and records why in the packet. The factory keeps every packet's run folder (prompts, final reports, acceptance logs) in `.theseus/scoreboard/runs/<id>/` for the audits.

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
2. Fill in `adapter.yaml` and `oracle.md`. A model may draft them from the repository, but a human reviews the goals.
3. Implement the `tools` scripts and run them: graph and metrics.
4. `theseus validate` until there are no errors (section 7).
5. Follow the flow: **Atlas → Diagnosis → Oracle → Factory → Scoreboard**.

## 7. Adapter validation

`theseus validate` checks:

- [ ] `goals.statement` says what the work must deliver, and `goals.measure` how it is measured.
- [ ] At least two model families have the reviewer role (packet rule R4).
- [ ] There is an `interop-<pair>.md` for each allowed migration.
- [ ] `AGENTS.md` points to `.theseus/`.
- [ ] With `--run`: every `build` and `oracle` command runs without errors.

The oracle must also be stable: run twice on the same code, it gives the same result.

## 8. Versioning

- The adapter has its own version (`.theseus/adapter/VERSION`), recorded in every packet.
- Adapter changes follow the same TEP cycle as the measurement specification, marked `scope: adapter`.
- When an adapter change proves useful in several projects, it is a candidate to move into the core.
