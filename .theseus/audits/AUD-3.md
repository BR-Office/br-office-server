# AUD-3: Method audit, scoreboard records 50 to 76

- Auditor: claude-opus-5-5 (packet PKT-0074). Same family as every executor and reviewer of the period (pilot mode `review.allow_same_family: true`); weakens independence, as in AUD-2.
- Records: lines 50 to 76 of `packets.jsonl` (27 records, 23 distinct packets), friction lines 61 to 79 (19 lines), 0 escapes.
- `method_version` 0.1.0 and `adapter_version` 0.1.0 on 27/27 records; tool 0.16.1 (records 50-61, 63-64) and 0.16.2 (62, 65-76).
- Previous audit: AUD-2. TEPs under test: TEP-0001 to TEP-0004. TEP-0005 and TEP-0006 are still `proposed` (never applied), so no verdict on them.

## 1. Period scoreboard (compared with AUD-2)

Outcomes: 16 `done`, 6 `blocked` (PKT-0053, 0055, 0057, 0063, 0064, 0066), 5 `discarded` (PKT-0053, 0055, 0060, 0061, 0062). Total cost $27.59: done $21.68 (median $1.03), blocked $5.91 (median $0.21 per record excluding PKT-0055's $0.00).

| Part | Indicator | AUD-3 | AUD-2 | Balancing pair | AUD-3 | AUD-2 |
|---|---|---|---|---|---|---|
| Packet | Estimated vs actual | median 27% of `estimated`; over in 1/16 (PKT-0043, 2373 of 800). `estimated.source: budget` 22/22 | 16%, budget 23/23 | Escapes per packet | 0 | 0 |
| Packet | Spawned per done packet | 10/16 = 0.63 | 0.17 | | | |
| Atlas | Out-of-context reads | null 27/27 | null 27/27 | Context size | mean 7.5%, max 13.0% (PKT-0045) | 8.0%, max 15.9% |
| Atlas | "missing" friction tied to Atlas/cards | 2 (PKT-0042 x2t card, PKT-0043 sdkjs-word card) | 9 | | | |
| Oracle | Escapes, `failed_component: oracle` | 0 | 0 | Acceptance run time | not recorded | not recorded |
| Oracle | Flaky oracle | 0/22 filled | 0/23 | | | |
| Review | Rejections that prevented a real problem | 4 review rejections on done packets (PKT-0042, 0046, 0047, 0056), all concrete and fixed in attempt 2; 5 external-blocker rejections | 1 + 2 | Review cost | $6.02 of $27.59 (22%) | 19% |
| Review | Escapes, `failed_component: review` | 0 | 0 | | | |
| Diagnosis | Reverted verdicts | 0 | 0 | Gain in migrated modules | refactor packets PKT-0059, 0067 done; no migration measured | none |
| Factory | Done per day | 16 (one date) | 23 | First-review approval | 13/16 = 81% (PKT-0056 approved with a rejection reason on record) | 96% |
| Factory | Blocked + discarded cost | $5.91 (21%) over 6 records | $5.23 (16%) | | | |
| Factory | Permission denials per record | 0/27 | 3.3 | | | |
| Routing | Cost/approval per model | claude-opus-5-5 executes 23, claude-opus-5-5-b executes 3 (PKT-0048, 0051, 0054; all first-review approved); effort `low` 22/22 | 1 pair | Escapes per model | 0 | 0 |

## 2. Verdict on hypotheses under test

- **TEP-0001 (block on first external rejection): mechanism confirmed, numeric target narrowly missed.** Cost per blocked record: $1.84 (AUD-1) → $1.31 (AUD-2) → $0.99 (AUD-3), -46% vs a -50% target. Cumulative sample is now 9 blocked packets (≥5). All 5 external blocks stopped at attempt 1 for $0.20-0.22 (PKT-0053, 0057, 0063, 0064, 0066). The remainder is PKT-0055, which ran 3 attempts against a literal `[ORACLE COMMAND]` placeholder (deterministic failure, AUD-2 O1 class). Recommend `confirmed` for the external-block rule.
- **TEP-0002 (environment preflight): lacks data.** No record has a `requires` field; no block named the environment. PKT-0066 blocked on a missing sdkjs fork (a repository-location gap, not a preflight check). Sample 0 of 5.
- **TEP-0003 (acceptance checks Goal content): not supported.** First-review approval fell from 96% to 81%; the 3 first-review rejections (PKT-0042, 0046, 0047) were all things the acceptance could have caught but did not run: five executors say the acceptance does not exercise the deliverable (PKT-0042, 0043, 0044, 0047, 0048 friction, `ref: acceptance`). The review, not the oracle, is still what checks the Goal. Keep testing one more period only with TEP-0008 applied; otherwise mark `refuted`.
- **TEP-0004 (fill indicator fields, agent friction): confirmed for done packets, gap on blocked.** `estimated`, `context_ratio`, `flaky_oracle` filled on 22/22 non-discarded records; 16/16 done packets have an agent friction line. But 0/6 blocked packets have a friction line (PKT-0053, 0055, 0057, 0063, 0064, 0066), and `out_of_context_reads` is null for the third audit running.

## 3. Findings (≥ 20 records affected)

**F1. `method_version` still 0.1.0 on 27/27 records (measurement).** Same as AUD-2 F2; TEP-0006 was proposed but never approved. The before/after split for every TEP is again inferred from `tool_version`. Repeating: TEP-0006 should be decided by the human before AUD-4.

**F2. Permission denials went from 3.3 per record to 0 with TEP-0005 still `proposed` (factory, measurement).** 0/27 records have denials. The change came from outside the method (permission configuration of the factory runs), so it is not attributable to any TEP and not recorded in the changelog. The effect is the one TEP-0005 predicted; the record is missing. Recommendation: mark TEP-0005 `confirmed` only after it is formally applied and versioned, or `rejected` as superseded, with the reason.

**F3. `estimated` is budget-derived on 22/22 records (packet).** Unchanged from AUD-2 F3: median actual is 27% of budget; the only overrun (PKT-0043, 2373 vs 800) and PKT-0047's first attempt (4875 lines, rejected) are caught by review, not by an estimate. Covered by TEP-0006.

**F4. Same-family review in 22/22 reviews (review).** Executors and reviewers alternate `claude-opus-5-5` / `-b`, never another family. Recorded, no TEP (human decision).

## 4. Observations (fewer than 20 packets)

- **O1. Targets too narrow for their Goal: the main cause of blocks and spawns.** PKT-0057, 0063, 0064 blocked because the Goal needed files outside `target.files`; PKT-0041 and 0051 could not write `baseline.md` named in their Goal; PKT-0046 could not generalize a runner outside its target. 6 packets, and most of the 10 spawns. → TEP-0007.
- **O2. Packets with template placeholders still reach the queue.** PKT-0053 (`[FILE]`, `[WHAT MUST NOT CHANGE]`), PKT-0055 (`[ORACLE COMMAND]`, 3 wasted attempts), then discarded with PKT-0060, 0061, 0062: 5 packets. AUD-2 O5 recurring. → TEP-0007.
- **O3. Acceptance does not run the packet's deliverable.** PKT-0042, 0043, 0044, 0047, 0048 (acceptance runs `unit.sh`/lint, not the new oracle; investigate packets with empty acceptance). → TEP-0008.
- **O4. Integration merges lose delivered content.** PKT-0059 and PKT-0067 had to restore baseline/profile content dropped in conflicted merges from PKT-0045. → TEP-0008 (validate check).
- **O5. Duplicate/superseded packets still queued.** PKT-0050 (origin diagnosis already said superseded). AUD-2 O3 recurring, 3 packets total.
- **O6. Missing packet types.** PKT-0051 (docs-only), PKT-0054 (fix/optimize) had to pick a wrong `type`.
- **O7. Factory auto-commit turns stray clones into gitlinks.** PKT-0056 R2 rejection on `external/sdkjs-forms`.

## 5. Proposals (ordered by expected impact)

1. **TEP-0007**: Lint packets at issue time: no placeholders, Goal paths inside the target (packet). From O1, O2.
2. **TEP-0008**: Acceptance must exercise the deliverable; `theseus validate` checks delivered files survive integration (oracle). From O3, O4; also the condition to keep testing TEP-0003.

TEP-0005 and TEP-0006 remain open for a human decision (F1, F2). O5-O7 are left without TEPs.

## 6. What not to change

- **Blocking at once on external rejections (TEP-0001).** Five blocks at about $0.21 each this period.
- **Agent friction on every done packet (TEP-0004).** 16/16; it is what made O1-O4 visible with ids.
- **Concrete review rejections.** PKT-0046, 0047 and 0056 friction: the rejection named exact numbers/files, so attempt 2 was "mechanical". All 4 rejected packets finished in attempt 2.
- **Strict targets plus spawn requests.** Even though O1 shows targets cut too narrow, the cure is better slicing at issue time, not widening scope in execution: no record in the period touched files outside its target unnoticed.
- **`adapter/environment.md`.** Cited as "helped" by PKT-0041, 0043, 0047, 0048, 0051: measurement started immediately.
- **Essential context with exact anchors.** PKT-0050, 0054, 0056, 0059, 0067 credit it; in PKT-0059 and 0067 it rescued work lost in merges.
