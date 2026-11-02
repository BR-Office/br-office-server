# AUD-2: Method audit, scoreboard records 23 to 49

- Auditor: claude-opus-5-5 (packet PKT-0052). Same family as every executor and reviewer of the period; the adapter runs in pilot mode (`review.allow_same_family: true`), so this is allowed but weakens §5 "Who audits".
- Records: lines 23 to 49 of `packets.jsonl` (27 records, 25 distinct packets), friction lines 16 to 60 (45 lines), 0 escapes.
- `method_version` 0.1.0 and `adapter_version` 0.1.0 on all 27 records; tool 0.13.5 (records 23-26) and 0.14.1 to 0.16.0 (records 27-49).
- Previous audit: AUD-1. TEPs under test: TEP-0001 to TEP-0004 (`status: testing`, implemented in Theseus 0.14.0). "Before" = records 23-26 (tool 0.13.5, 4 records), "after" = records 27-49 (23 records).

## 1. Period scoreboard (compared with AUD-1)

Outcomes: 23 `done`, 4 `blocked` (PKT-0027 twice, PKT-0029, PKT-0041). Total cost $33.45: done $28.22 (median $0.99), blocked $5.23.

| Part | Indicator | AUD-2 | AUD-1 | Balancing pair | AUD-2 | AUD-1 |
|---|---|---|---|---|---|---|
| Packet | Estimated vs actual | actual diff lines are a median 16% of `estimated`; files over estimate in 5/23. `estimated.source` is `budget` in 23/23, so this measures budget slack, not slicing | not computable | Escapes per packet | 0 | 0 |
| Packet | Spawned per done packet | 4/23 = 0.17 (PKT-0018:1, 0021:2, 0031:1) | 0.6 | | | |
| Atlas | Out-of-context reads | null 27/27 | null | Context size | mean 8.0% of window, max 15.9% (PKT-0028), 23/23 filled | null |
| Atlas | "missing" friction tied to the Atlas | 9 of 17 "missing" answers (atlas/graph.json ×4, atlas cards ×5) | 0 | | | |
| Oracle | Escapes, `failed_component: oracle` | 0 | 0 | Acceptance run time | not recorded | not recorded |
| Oracle | Flaky oracle | 0/23 filled records | null | | | |
| Review | Rejections that prevented a real problem | 1 review rejection (PKT-0021, unmet Goal item 2, justified); 2 rejections naming external blockers (PKT-0029, PKT-0041) | 14 | Review cost | $6.21 of $33.45 (19%) | 26% |
| Review | Escapes, `failed_component: review` | 0 | 0 | | | |
| Diagnosis | Reverted verdicts | 0 (diagnoses PKT-0024, 0025, 0036-0039 not revisited) | 0 | Gain in migrated modules | no migration yet | none |
| Factory | Done per day | 23 (one date, 2026-11-02) | 10 | First-review approval | 22/23 = 96% | 70% |
| Factory | Blocked cost | $5.23 (16%) over 3 packets | $7.34 (38%) | | | |
| Routing | Cost/approval per model | claude-opus-5-5 executor 27/27, reviewer claude-opus-5-5-b 23/23; effort `low` 27/27 | 1 model pair | Escapes per model | 0 | 0 |

## 2. Verdict on hypotheses under test

- **TEP-0001 (block on first external rejection): lacks data, mechanism confirmed.** Cost per blocked record fell from $1.84 to $1.31 (-29%, target -50%). Only 3 blocked packets (minimum sample 5). The two external blocks did stop at attempt 1: PKT-0029 ($0.81, `review#external`) and PKT-0041 ($0.81). The cost that remains is PKT-0027 ($3.60 over 2 records, 6 attempts), which failed a deterministic acceptance command (`npm run lint:check`) on main-branch lint debt; TEP-0001 does not cover that class (see O1).
- **TEP-0002 (environment preflight): lacks data.** No record carries a `requires` field; only 2 queue packets declare `requires: [documentserver]` (PKT-0041, PKT-0051), and PKT-0041 was blocked on permissions, not on the environment. Sample 1 of a minimum 5.
- **TEP-0003 (acceptance checks Goal content): supported, confounded.** Goal-citing review rejections per done packet fell from 1.4 (14/10) to 0.04 (1/23), and the only one (PKT-0021) is from before 0.14. But the period's packets were mostly repo-only investigate/diagnose work, which already passed first review in AUD-1 (O1). Packet acceptance still does not test the Goal in many cases: this packet's own acceptance is `test -s` plus one grep; friction PKT-0018 and PKT-0026 call `test -s` proofs that "prove nothing". Keep testing; do not confirm.
- **TEP-0004 (fill indicator fields, agent friction): confirmed, with one gap.** `estimated`, `context_ratio`, `flaky_oracle` are null in 4/4 "before" records and 0/23 "after" records. 23/23 done packets have an agent-written friction line (target ≥90%, from 30%). Duration did not grow (done median ≈3 min). Gaps: `out_of_context_reads` is still null 27/27, and `estimated` is always budget-derived, so the Packet row is filled but not meaningful (F3).

## 3. Findings (≥ 20 records affected)

**F1. Permission denials are the dominant friction, and they hit read-only commands (factory).**
88 permission denials in 21 of 27 records. 22 of 45 friction lines are factory permission dumps; agents add the same complaint in their own words in PKT-0030, 0031, 0032, 0033, 0037, 0038, 0039, 0049 (compound reads `ls; head`, `sed -n`, `find -exec wc`, pipes). Examples: PKT-0039 "sed for reading a file range was refused", PKT-0037 "Read-only pipelines ... were refused". This costs time and context on every packet and it is the same signal AUD-1 O6 saw. → TEP-0005.

**F2. TEPs were implemented without bumping the method version (measurement).**
All 27 records report `method_version: 0.1.0`, and `METHOD-CHANGELOG.md` lists only 0.1.0, while TEP-0001 to 0004 are `testing` and "implemented in Theseus 0.14.0". The before/after split above had to be inferred from `tool_version`. §6 says TEPs enter "testing (new version)". Without the version, the next audit cannot attribute effects to a TEP or revert a refuted one cleanly. → TEP-0006.

**F3. `estimated` is filled from the budget, so the slicing indicator is empty of meaning (packet, measurement).**
23/23 "after" records have `estimated.source: budget`; actual diff lines are a median 16% of it (PKT-0047: 5 of 800, PKT-0042: 17 of 1500). The deviation measures budget slack. Packets do not carry their own `estimated`. → folded into TEP-0006 as a measurement fix rather than a separate TEP.

**F4. Same-family review in 23/23 reviews (review).**
claude-opus-5-5-b reviewed claude-opus-5-5 in every reviewed record. It is allowed by the pilot flag, but "review adds value" still cannot be separated from "same-family review adds value". With one review rejection in 23 the review's marginal value in this period cannot be shown at all. No TEP: this is an adapter decision the human already took; recorded so it is not mistaken for evidence.

## 4. Observations (fewer than 20 packets)

- **O1. Deterministic acceptance failures still burn 3 attempts.** PKT-0027 failed `npm run lint:check` 6 times over 2 records ($3.60) because of lint debt outside its target; fixed only after PKT-0049 (spawned) landed. Same shape as AUD-1 O2 but not "external": a failure identical across attempts with no diff in the failing files should block early.
- **O2. Work from failed attempts is still lost.** PKT-0027 ("Work from blocked attempts was not committed"), PKT-0022 ("patched scripts lived in a lost scratchpad"). Same as AUD-1 O8; 2 more packets.
- **O3. Duplicate packets reach the queue.** PKT-0035 and PKT-0040 duplicated work already merged by PKT-0049; both executors say so in friction. Cheap ($0.56, $0.47) but avoidable by a dedupe check at plan time.
- **O4. Atlas is missing `graph.json`.** PKT-0030, 0031, 0032, 0033 friction: "no graph.json, so every tool field of the card is null". Diagnostician friction (PKT-0024, 0036-0039) asks for per-module profiles the cards lack. This is project work, requested as a spawn (see Spawned packets of PKT-0052).
- **O5. Packets issued with template placeholders.** PKT-0021 and PKT-0022 had placeholder `target`, `contract` and empty acceptance (friction), the period's only first-review rejection. Both before 0.14.
- **O6. No wall-clock budget.** PKT-0018 first attempt hit a 30 minute timeout; friction asks for a time budget field.

## 5. Proposals (ordered by expected impact)

1. **TEP-0005**: Allow read-only compound shell commands by default (factory). From F1.
2. **TEP-0006**: Bump `method_version` and the changelog when a TEP enters testing; record the packet's own estimate (measurement). From F2, F3.

Observations O1-O3 are left without TEPs until they reach 20 packets; if they recur in AUD-3 the natural proposals are "block on an identical deterministic failure" and "commit WIP of each attempt to the packet branch".

## 6. What not to change

- **TEP-0004's mechanism.** It turned 3 uncomputable indicator rows into computable ones and lifted agent friction from 30% to 100% of done packets with no time cost. Keep it.
- **Blocking at once on external rejections (TEP-0001).** PKT-0029 and PKT-0041 stopped at one attempt each, $0.81 apiece, against $1.84 per blocked record in AUD-1.
- **Strict targets and spawn requests.** PKT-0027 friction ("Spawning the lint follow-ups instead of widening scope got the main-branch lint fixed") and PKT-0028 ("Characterize-only scope ... kept the work to one test file").
- **Essential context with exact anchors.** Helped answers in PKT-0019, 0034, 0035, 0049 credit the packet's context for direct execution.
- **`oracle/baseline.md` as shared evidence.** Cited as "helped" by PKT-0024, 0025, 0036, 0037, 0038, 0039: diagnoses argued from measured numbers.
- **The goal-focused review.** The one rejection (PKT-0021) named an unmet Goal item and a way to narrow it.
