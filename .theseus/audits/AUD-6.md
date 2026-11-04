# AUD-6 — Method audit, scoreboard records 119 to 139

Auditor: claude-opus-5-5 (same family as every executor and reviewer of the period; see F3). Date 2026-11-04.
Sample: 21 records (PKT-0100 … PKT-0127): 10 done, 3 blocked, 8 discarded. 1 record on method 0.4.0, 17 on 0.5.0 (tools 0.23.1–0.23.4), 3 on 0.6.0 (tool 0.24.1).
The 8 discards (PKT-0117 … 0124) were never run: Rafael discarded them by hand ("finish one application, the document editor, first"). Only 13 records carry agent work, so almost every rule-level statement below is an observation, not a finding.

## 1. Indicators (balancing pairs)

| Part | Indicator | Value | Pair | Value |
|---|---|---|---|---|
| Packet | estimated vs actual deviation | 1 computable record: PKT-0107 planner est. 1 file / 80 lines, actual 3 / 21. Planner estimate on 4/13 run records (0107, 0108, 0111, 0112), budget on 9 | escapes per packet | 0 (escapes.jsonl empty) |
| Packet | spawned packets per run record | 2/13 recorded (0126, 0127); 0112 spawned a Toolbar request not counted (`spawned_packets: 0`) | | |
| Atlas | out-of-context reads | null on 13/13 (sixth audit) | median context ratio (done) | 7.8% |
| Atlas | "missing" friction tied to Atlas/oracle | 6 lines: PKT-0104, 0105 (no fork-build perf script, no multi-run median), 0126 (no journey CPU profiler), 0127 (no shared journey runner), 0102 (no DocService differential), 0103 | | |
| Oracle | escapes `failed_component: oracle` | 0 | flakiness | `flaky_oracle` false 13/13, friction reports flakes/noise in 5: PKT-0103 (x2t browser half 1 of 2 failed), 0104, 0105, 0106, 0108 |
| Oracle | | | acceptance run time | x2t differential 5–10 min/run (PKT-0103, 0107) |
| Review | rejections that prevented real problems | 3/3 blocks named a concrete target gap (0108 core files, 0111 Toolbar.template, 0112 Toolbar.js); 0127 R6 spawn placeholder | review cost | $2.72 of $10.31 done cost (26%) |
| Factory | done per day | 10 (one day) | first-review approval | 10/10 recorded true, but 0127 was rejected (R6) → 9/10 = 90% |
| Factory | blocked cost | $15.30 on 3 blocked = 60% of $25.61 period spend | median done duration | 15.6 min (AUD-5: 11.6) |
| Routing | executor | claude-opus-5-5 low on 12/13, claude-opus-5-5-b on 1 (PKT-0126) | escapes per model | 0 |

Data quality: PKT-0127 has `approved_first_review: true` with an R6 rejection (same defect as AUD-4, AUD-5). Blocked PKT-0108, 0111, 0112 have no friction line. PKT-0112 `spawned_packets: 0` while its log records a spawn.

## 2. Verdict on TEPs under test

- **TEP-0011 (fork scope-check, stop on repeated gate rejection): confirmed on the R2 half.** R2 rejections naming `external/`: 0 of 13 run records (AUD-5: 7 of 22). Blocked-cost half refuted: 60% of spend (target <10%, AUD-5 22%) — but the cause changed: none of the 3 blocks is a gate rejection; all are reviewer "external blocker" verdicts on a Goal the target cannot reach (O1). No file outside a target reached done.
- **TEP-0012 (chore and measure types): observation, sample too small.** 2 `measure` packets (0126, 0127), 0 `chore` (minimum 3 each). Both measure packets approved (0127 after an R6 fix). Missing-type friction: 1 line (PKT-0102 "no plan type for pure measurement packets", filed before the types were usable by its planner) vs 3 in AUD-5.
- **TEP-0013 (journeys): not yet measurable.** 3 records on 0.6.0. `open-docx-10p` p50 `total_ms` 8340 (target <2.5 s). `.theseus/scoreboard/journeys.jsonl` named in the TEP's "How to verify" does not exist; the numbers live in `.theseus/journeys/*.md` only.
- **TEP-0004 (friction lines): partially missed.** 10/10 done have a line; 0/3 blocked do — the blocks with the most to teach (60% of spend) left no friction.
- **TEP-0006 (planner estimate): still refuted.** Planner source on 4/13; the deviation indicator has one usable point.
- **TEP-0001 (block on external rejection): confirmed.** 0108 and 0112 blocked after 1 and 2 attempts. PKT-0111 still burned 3 attempts ($9.86): the first two rejections stated "bar not met" without the word external, so the rule did not fire until the third.
- **TEP-0009 (spawn lint): regressed once.** PKT-0127 spawn reached review with template placeholders; its friction: "validate does not flag" them.

## 3. Findings (≥ 20 records)

**F1. `out_of_context_reads` null for the sixth audit (atlas).** 13/13 run records. Drop the field or measure it.
**F2. `flaky_oracle` false on every record while friction reports noise in 5 of 13 (oracle).** PKT-0103, 0104, 0105, 0106, 0108. Same as AUD-5 F4.
**F3. Same-family execution, review and audit (review).** 13/13. PKT-0126 swapped roles inside the same family (`-b` executes, base reviews); this does not satisfy the rule. Human decision, recorded again.
**F4. `approved_first_review` ignores factory rejections, third audit (factory).** PKT-0127 here; AUD-4 and AUD-5 had the same.

## 4. Observations (< 20 records)

- **O1. Goals with a quantitative bar the target cannot reach.** PKT-0108 (needs external/core, target empty), 0111 (bar "drop > run spread" with ~300–600 ms spread; cost lives in Toolbar.template), 0112 (needs Toolbar.js). $15.30, 60% of spend, 0 delivered. Reviewers caught it each time; planners never checked it. → TEP-0014.
- **O2. Timing noise defeats perf bars on a shared VM.** 0108 (wall medians moving 60%), 0111, 0112 (ABBA −25 ms pooled, IQR −130…+56), 0105 (20–40% spread). No multi-run/paired mode in the oracle (0105 friction). → TEP-0014.
- **O3. Discards before any run inflate the sample.** 8/21 records are human discards with no agent work, so the audit trigger (`every_n_packets: 20`) fired on 13 real runs. → TEP-0015.
- **O4. Project gaps reported by friction (not method):** journey runner copied per journey (0127), no fork-build perf script (0104), no DocService differential (0102). Planners can address these as `measure`/`chore` packets; no spawn needed from this audit since each is already in a friction line the planner reads.

## 5. Proposals

1. **TEP-0014** (packet): a Goal with a numeric bar must name the measurement protocol (paired runs, n, statistic) and every file the change needs must be in target; the planner checks both before queueing. From O1, O2.
2. **TEP-0015** (factory): records discarded before a claim do not count toward `audit.every_n_packets` and are listed apart. From O3.

## 6. What not to change

- **Fork scope-check (TEP-0011).** R2 rejections on nested clones fell from 7 to 0; it removed the AUD-5 main cost driver.
- **Reviewer "external blocker" verdicts (TEP-0001).** All 3 blocks were correct and specific (0108, 0111, 0112 each named the missing file); without them 0111 and 0112 would have shipped changes that do not move the number.
- **Work preservation across restarts (TEP-0010 with tool ≥0.23).** PKT-0112 recovered its change from an orphan commit after a container reset; 0108 kept work over two factory restarts.
- **Detailed Executor and diagnosis logs.** PKT-0104, 0105, 0106 friction: round-1 logs made the verdict "a direct check".
- **Agent friction lines on done packets.** 10/10; every observation above cites them.
- **Packet lint for placeholders (TEP-0007).** 0 blocks from malformed packets in 13 runs.
