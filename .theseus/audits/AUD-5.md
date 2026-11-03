# AUD-5 — Method audit, scoreboard records 97 to 118

Auditor: claude-opus-5-5 (same family as every executor and reviewer of the period; see F3). Date 2026-11-03.
Sample: 22 records (PKT-0088 … PKT-0099): 16 done, 5 blocked, 1 discarded. 5 records on method 0.3.0 (tool 0.19.1), 17 on 0.4.0 (tools 0.20.0–0.21.9).

## 1. Indicators (balancing pairs)

| Part | Indicator | Value | Pair | Value |
|---|---|---|---|---|
| Packet | estimated vs actual deviation | not computable: `estimated.source: budget` on 20/20 records with an estimate (2 null) | escapes per packet | 0 (escapes.jsonl empty) |
| Packet | spawned packets per record | 6/22 = 0.27 (PKT-0089, 0090, 0091, 0084, 0097, 0098) | | |
| Atlas | out-of-context reads | null on 22/22 (fifth audit) | median context ratio (done) | 6.8% |
| Atlas | "missing" friction tied to Atlas/env | 4 lines: PKT-0090 (card counts drift), 0097, 0098 (`external/sdkjs.base` undocumented), 0091 (no `.theseus-addons` exclude) | | |
| Oracle | escapes `failed_component: oracle` | 0 | flakiness | `flaky_oracle` false on 20/20, yet friction reports flakes: PKT-0070 (request.tests.js), 0096 (racy page count), 0094 (canvas noise) |
| Oracle | | | acceptance run time | PKT-0094 ~15 min/run, 104 min total; PKT-0092 3 min for a comment-only change |
| Review | rejections that prevented real problems | 4/4 reviewer rejections concrete: PKT-0085 (co-editing stale styles), 0090 (missing test + stale comments), 0097 (missing spawn), 0094 | review cost | $5.24 of $18.50 done cost (28%) |
| Factory | done per day | 16 (one day) | first-review approval | 12/16 = 75% (AUD-4 baseline for TEP-0008: 81%) |
| Factory | blocked cost | $5.31 on 5 blocked records = 22% of $23.81 | median done duration | 11.6 min |
| Routing | executor | claude-opus-5-5 low on 22/22; no comparison possible | escapes per model | 0 |

Data quality: PKT-0087 #2, 0091, 0095 carry `approved_first_review: true` with an R2 factory rejection (same issue as AUD-4). PKT-0094 #1 and 0099 have no cost fields.

## 2. Verdict on TEPs under test

- **TEP-0001 (block on external rejection): confirmed, no new data against it.** No external block in the period.
- **TEP-0002 (environment preflight): refute for non-use.** 0/22 records carry `requires`; only discarded PKT-0099 declared one. Third audit at sample 0, as AUD-4 warned. The factory's `environment.checks` run before each agent now covers the need in practice (PKT-0095 friction credits the running documentserver/browser).
- **TEP-0003 / TEP-0008 (acceptance checks the Goal / runs the deliverable): refuted on the approval hypothesis.** Approval 75% vs target ≥92% and baseline 81%. PKT-0089 friction: "acceptance only greps for PKT-0087 in baseline.md; it cannot catch that the expected 30/30 did not happen". Median done duration 11.6 min vs target ≤10. Integration-loss friction did not fall (see TEP-0010).
- **TEP-0004 (indicator fields, friction): met for friction, missed for fields.** 16/16 done packets have an agent friction line, and the 4 R2-blocked packets got lines when they were redone. `out_of_context_reads` still null 22/22: that half is refuted; drop the field or measure it.
- **TEP-0006 (versioning + planner estimate): half confirmed.** 22/22 records carry a version present in METHOD-CHANGELOG (0.3.0, 0.4.0) — fixes AUD-2..4 F1. But `estimated.source: planner` on 0/20: the planner half is refuted.
- **TEP-0007 (packet lint): confirmed on a short sample.** 0 blocked or discarded records from placeholders, missing acceptance or cross-packet targets (22 records; hypothesis sample 27).
- **TEP-0009 (all placeholders, spawn lint, stop on repeated failure): placeholder half confirmed, repeat half missed.** 0 placeholder blocks, 0 R6 spawn rejections (AUD-4: 5). But PKT-0085, 0087, 0058, 0090 each burned 3 attempts on the *same* R2 message ($5.31) — the "same failure twice → stop" rule covers acceptance output, not factory gate rejections.
- **TEP-0010 (preserve attempt work): refuted on its own terms.** Lost-work friction in 5 packets (PKT-0087, 0085, 0058, 0090, 0095; target ≤1). R2 rejections rose from 2 (AUD-4) to 7 records, against the "no increase in R2" guard — the preservation commit itself caused them (PKT-0087, 0091, 0093, 0095: auto-commit added the `.theseus-addons` gitlink). Mitigating: after tool 0.21 no loss is reported and resume is credited (PKT-0094, 0096). Multi-attempt median 13.1 min (one outlier 104 min).

## 3. Findings (≥ 20 records)

**F1. Planner estimates absent on 20/20 (packet).** Fourth audit running; deviation indicator still dead. TEP-0006 planner half refuted.

**F2. `out_of_context_reads` null on 22/22 (atlas).** Fifth audit. The Atlas row can only use friction proxies.

**F3. Same-family review and audit on 22/22 (review).** `claude-opus-5-5` reviewed by `claude-opus-5-5-b`; this audit is also same family. Human decision, recorded again.

**F4. `flaky_oracle` false on 20/20 while 3 friction lines report flakes (oracle).** PKT-0070, 0096, 0094. The field carries no signal.

## 4. Observations (< 20 records)

- **O1. Fork-checkout scope check is the main cost driver.** 7 records rejected on R2 for `external/sdkjs` (DrawingDocument.js diffed against origin/main: PKT-0085, 0087, 0058, 0090 on 0.3.0; `.theseus-addons` gitlink from the oracle's addon clone: PKT-0087, 0091, 0095, plus 0093 fixed by hand). 4 blocks at 3 attempts each, $5.31. → TEP-0011.
- **O2. `external/sdkjs.base` not provisioned.** PKT-0097 and 0098 cloned it by hand; fix packet PKT-0099 discarded (factory work, not project). → TEP-0011.
- **O3. Packet types missing.** No `chore`/`measure` type: PKT-0090, 0091, 0097 filed as refactor/characterize. → TEP-0012.
- **O4. Measurement harnesses live in scratchpads.** PKT-0089, 0093, 0084: the A/B harness is rewritten from prose because `create_in` omits `oracle/perf`. Project work; planners should add it to `create_in`.
- **O5. Concurrency limits unknown.** PKT-0095 OOM-killed 5 times while another packet compiled x2t; PKT-0094 timed out at 90 min.
- **O6. Oversized acceptance.** PKT-0092 (comment-only, 3 min of oracles), PKT-0094 (15 min per run).

## 5. Proposals

1. **TEP-0011** (factory): scope-check nested clones against their own fork base, exclude oracle-created dirs (`.theseus-addons/`), give the executor `theseus scope-check` before delivery, provision `*.base` clones; block on the second identical gate rejection. From O1, O2, TEP-0009 gap.
2. **TEP-0012** (packet): add `chore` and `measure` packet types. From O3.

## 6. What not to change

- **Packet lint (TEP-0007/0009 placeholder half).** Zero placeholder blocks and zero R6 spawn rejections, down from 5.
- **Method versioning (TEP-0006 first half).** 22/22 records map to a changelog entry; this audit could split the sample by version for the first time.
- **Concrete review rejections.** PKT-0085's reviewer found a co-editing stale-style bug that `contract.preserve` did not spell out; PKT-0090 and 0097 rejections named exact fixes and were fixed in one attempt.
- **Agent friction lines.** 16/16 done; every observation above cites them.
- **Detailed Executor logs.** PKT-0085, 0058, 0090 redid lost work "in minutes" from the log.
- **Content-cached builds and resume (tool ≥0.21).** PKT-0094 skipped a 90-min x2t rebuild; PKT-0093, 0084 credit cached differential builds.
- **Packets naming exact cause and fix.** PKT-0092, 0097, 0098, 0091.
