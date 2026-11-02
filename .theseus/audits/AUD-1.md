# AUD-1: Method audit, scoreboard records 1 to 22

- Auditor: claude-opus-5-5 (same family as almost every executor and reviewer in the period; see O7)
- Method version: 0.1.0, adapter 0.1.0, tool 0.12.0 to 0.13.4
- Period: 2026-11-02 (one day), 22 records in `packets.jsonl`, 0 in `escapes.jsonl`, 15 lines in `friction.jsonl`
- Previous audit: none. No TEP is under test, so there is no verdict section to give.

**Sample size warning.** The 22 records cover 18 distinct packets. No rule affected 20 or more packets, so under the auditor rules everything below is an **observation**, not a finding. The proposals are framed so the next audit can confirm or refute them.

## 1. Period scoreboard

Final outcomes of the 22 records: 10 `done`, 7 `discarded`, 5 `blocked` (PKT-0002, PKT-0016 twice, PKT-0017, PKT-0018).

| Part | Indicator | Value | Balancing pair | Value |
|---|---|---|---|---|
| Packet | Estimated vs actual deviation | **not computable**: `estimated` is null in 22/22 | Escapes per packet | 0 (but see O5) |
| Packet | Spawned packets per done packet | 6 / 10 = 0.6 (PKT-0013:2, 0014:1, 0015:2, 0016:1) | | |
| Atlas | Out-of-context reads | **not computable**: null in 22/22 | Context size (% of window) | **not computable**: `context_ratio` null in 22/22 |
| Atlas | "missing" friction tied to the Atlas | 0 (the 2 "missing" lines point to AGENTS.md and the packet log) | | |
| Oracle | Escapes with `failed_component: oracle` | 0 | Acceptance run time | not recorded |
| Oracle | Flakiness | `flaky_oracle` null in 22/22 | | |
| Review | Rejections that stopped a real problem | 14 of 14 rejection reasons name an unmet Goal clause (PKT-0002 ×3, 0015 ×2, 0016 ×6, 0017 ×3); all appear justified | Review cost | $5.11 of $19.44 total (26%) |
| Review | Escapes with `failed_component: review` | 0 | | |
| Diagnosis | Reverted verdicts | 0 (PKT-0004, PKT-0005 not revisited yet) | Gain in migrated modules | no migration yet |
| Factory | Packets done per day | 10 | First-review approval | 7/10 = 70% |
| Factory | Blocked cost | $7.34 of $19.44 (38%) went to records that ended `blocked` | | |
| Routing | Cost and approval per model | claude-opus-5-5: 9 done, 7/9 first-review approved, $10.88; claude-opus-5-5-b: 1 done (PKT-0017), 0/1, $1.22 | Escapes per model | 0 / 0 |
| Routing | Effort | executor and reviewer effort `low` in 22/22; no comparison possible | | |

Cost of done records: $12.10 (mean $1.21, median $0.91). Cost of blocked records: $7.34.

## 2. Verdict on hypotheses under test

None: METHOD-CHANGELOG lists 0.1.0 with no TEPs.

## 3. Observations (each fewer than 20 packets)

**O1. First-review approval splits cleanly by environment dependence (factory, routing).**
All 7 first-review approvals are repository-only work: PKT-0001, 0003, 0004, 0005, 0007, 0013, 0014. All 3 first-review failures and all 4 costed blocks needed something outside the repository: a running Document Server (PKT-0015, 0016), the GitHub API (PKT-0015, 0017), or a file outside the target (PKT-0002). Cost per packet is about 3 times higher for these: done records PKT-0015, 0016 and 0017 cost $5.91, plus $7.34 of blocked records, against $6.19 for the 7 repo-only packets.

**O2. Retrying does not fix blockers outside the agent's control (factory).**
In every blocked record the rejection reasons repeat the same blocker across attempts: PKT-0002 (INDEX.md outside the target, 3 times), PKT-0016 (stack not installed, 6 times over two records), PKT-0017 (`gh api` refused, 3 times). In each case the reviewer named the remedy from the first rejection ("factory must add it to the target", "allow gh api", "an admin must fix…"), and the remedy was for a human or the factory, not the executor. Attempts 2 and 3 were spent with no new information. All 4 `block_reason.cause` values are `method`, ref `adapter#factory`.

**O3. Acceptance commands do not test the goal (oracle, packet).**
PKT-0016 rejection 3: "the acceptance check passes trivially". The record shows acceptance passing while the reviewer found no measurement. This packet's own acceptance (`test -s .theseus/audits/AUD-1.md`) has the same shape. For `investigate` packets the reviewer is the only real oracle; that held up here (O4), but it costs a review round each time.

**O4. Cross review caught every unmet goal (review), but it is not cross-family.**
None of the 14 rejection reasons reads as nitpicking: each names an unmet Goal clause or a budget breach (PKT-0015: "12 files against a budget of 6"). There were 0 escapes. However, reviewer `claude-opus-5-5-b` reviewed `claude-opus-5-5` in 13 of 14 reviewed records, and the reverse pair in PKT-0017. These are variants of the same family. Unless the adapter sets `review.allow_same_family: true`, this conflicts with the AGENTS.md rule. Either way, "review adds value" cannot be separated from "same-family review adds value".

**O5. Zero escapes is not evidence yet (oracle, review).**
`escapes.jsonl` is empty, but the period produced no production code: 15 of 18 packets are `investigate` and 3 are `characterize`. An escape needs a downstream consumer, which has not existed yet.

**O6. Friction is dominated by factory permission dumps; agents rarely write their own (measurement).**
12 of 15 friction lines have `source: factory` and only list refused commands. Only 3 lines were written by the agent: PKT-0007, PKT-0016 and PKT-0017. 7 of the 10 done packets (PKT-0001, 0003, 0004, 0005, 0013, 0014, 0015) have no agent friction line, despite the AGENTS.md rule. `permission_denials` is non-empty in 14/14 records that have the field, and many denials are harmless reads (`cat`, `ls`, `grep`, `sed`, `head`). These denials are friction no agent reported in its own words.

**O7. Measurement fields that the indicators need are never filled (measurement).**
`estimated`, `context_ratio`, `out_of_context_reads` and `flaky_oracle` are null in 22/22 records. So 3 of the 7 indicator rows (Packet, Atlas, part of Oracle) cannot be computed. This audit was also run by the same family that executed the period, against §5 "Who audits".

**O8. Knowledge gained in failed attempts is lost (packet).**
PKT-0017 friction ("missing"): the script and numbers from earlier attempts were not on the branch, only described in the log. PKT-0016 needed 7 attempts, and its install knowledge led to a separate packet (PKT-0019, pending) instead of being recorded in `environment.md` when it was found.

## 4. Proposals (ordered by expected impact)

1. **TEP-0001**: Block on the first rejection that names an external blocker (factory). Addresses O2 and O1.
2. **TEP-0002**: Preflight of the environment for packets that need one (factory, adapter). Addresses O1 and O6.
3. **TEP-0003**: Acceptance must check the Goal's content, not just that a file exists (packet, oracle). Addresses O3.
4. **TEP-0004**: Fill the measurement fields and require an agent-written friction line (factory, measurement). Addresses O6 and O7.

## 5. What not to change

- **The goal-focused review.** 14/14 rejections were justified and specific, and 0 escapes. Keep reviewers judging against the Goal, not style. Do not loosen review to raise the approval rate.
- **Strict targets and spawn requests.** PKT-0002 was painful, but the rule turned a hidden scope expansion into an explicit factory decision. Fix the packet planning (TEP-0001 blocks sooner); keep the rule.
- **Small investigate packets with Atlas cards.** The repository-only packets PKT-0001, 0003, 0004, 0005, 0007, 0013 and 0014 all passed on the first review at $0.64 to $1.19 and 1.7 to 9.3 minutes.
- **The 3-attempt limit.** It capped the damage on every blocker. TEP-0001 only shortens it for one class of rejection.
