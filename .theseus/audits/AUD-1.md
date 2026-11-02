# AUD-1 — Method audit, scoreboard records 1 to 28

- Auditor: claude-opus-5-5 (packet PKT-0022). **Same family** as both executors and reviewers of the period (Claude Opus / Sonnet); no cross-family audit was available. Weigh conclusions accordingly; a GPT-family second audit is recommended (spec §5).
- Period: 2026-11-02 (all records on one day). Method version 0.1.0, adapter 0.1.0 on every record.
- Previous audit: none. TEPs under test: none (`.theseus/proposals/` empty, METHOD-CHANGELOG lists only 0.1.0).
- Sources: `.theseus/scoreboard/packets.jsonl` (28 lines), `friction.jsonl` (21 lines, cited below as F1…F21 by line number), `escapes.jsonl` (empty).

## 1. Period scoreboard

28 records cover 21 distinct packets (PKT-0001…PKT-0021): 20 `done`, 7 `blocked` records (PKT-0002 ×2, PKT-0004, PKT-0011, PKT-0013, PKT-0009 ×2), 1 `discarded` (PKT-0019). Every blocked packet was later done; no packet remains blocked.

| Part | Indicator | Value | Balancing pair | Value |
|---|---|---|---|---|
| Packet | Estimated vs actual deviation | **not computable**: no record has `estimated` | Escapes per packet | 0 / 21 (but see finding F-A on the short window) |
| Packet | Spawned packets per packet | **not recorded** (`spawned_packets` absent); from logs: PKT-0004 spawned by PKT-0002, PKT-0019 hand-made then discarded | | |
| Atlas | Out-of-context reads per packet | **not recorded** | Context size (% window) | **not recorded** (`context_ratio` absent) |
| Atlas | "missing" friction tied to Atlas/cards | 0 of 21 friction lines (F4 says a card was 842 words vs the 800 limit — "unneeded", not missing) | | |
| Oracle | Escapes `failed_component: oracle` | 0 | Acceptance run time | not recorded |
| Oracle | Flakiness rate | not recorded (`flaky_oracle` absent); no friction reports flakiness | | |
| Review | First-review rejections | 6 of 20 done records (PKT-0004, 0009, 0011, 0013, 0014, 0021) | Review cost | $6.53 of $34.59 total (19%) |
| Review | Escapes `failed_component: review` | 0 | | |
| Diagnosis | Reverted verdicts | 0 recorded; F11: the D3 second diagnosis caught a real defect (tsconfig outDir) | Gain in migrated modules | not measurable yet (migrations PKT-0015…0018 finished same day) |
| Factory | Packets done per day | 20 done records in 1 day | First-review approval | 14 / 20 = **70%** |
| Factory | Cost of blocked attempts | $13.92 = **40%** of total spend; PKT-0009 alone $11.26 (33%) | | |
| Routing | see table below | | Escapes per model | 0 / 0 |

Routing (records, excluding the discarded PKT-0019):

| Executor | Type (effort) | Records | Blocked | Done | First-review OK | Cost |
|---|---|---|---|---|---|---|
| claude-opus-5-5 | investigate (high) | 4 | 0 | 4 | 4 | $4.91 |
| claude-opus-5-5 | characterize (low/medium) | 2 | 0 | 2 | 2 | $2.11 |
| claude-opus-5-5 | migrate (low) | 4 | 0 | 4 | 4 | $3.43 |
| claude-opus-5-5 | interop (high) | 3 | 2 | 1 | 0 | $11.26 |
| claude-sonnet-5-5 | investigate (high) | 2 | 0 | 2 | 2 | $1.17 |
| claude-sonnet-5-5 | characterize (low) | 11 | 5 | 6 | 1 | $10.21 |

Sonnet-low on `characterize` cost $1.70 per done packet with 1/6 first-review approval; Opus on the same type cost $1.06 per done packet with 2/2. Sample is far below 20 → **observation only** (M6).

## 2. Verdict on hypotheses under test

None: no TEP was applied in 0.1.0.

## 3. Findings

Rules affected by fewer than 20 packets are marked *observation* (M6). Only 21 packets exist, so almost everything is an observation; the findings marked as such are kept because they concern measurement itself, which affects every packet.

**F-A. The scoreboard cannot measure the method it is meant to measure (all 28 records).** Fields from spec §4.1 — `estimated`, `context_ratio`, `out_of_context_reads`, `spawned_packets`, `rejection_reasons`, `block_reason`, `flaky_oracle` — are absent from every record. Four of the seven indicators of §4.4 are therefore uncomputable. Also, escapes are 0 but the whole period is one day; zero escapes means "not yet looked", not "none". *Finding (28/28 records).*

**F-B. The method version never moved while the tooling changed five times.** Every record says `method_version: 0.1.0`, yet friction cites fixes in Theseus 0.7.1 (F8), 0.7.2 (F12), 0.7.3 (F13), 0.8.0 (F16, F17) and 0.9.0 (F19). Before/after comparison of those fixes is impossible: records cannot be split by the rules they ran under. *Finding (28/28 records).*

**F-C. All 7 blocked records were caused by the method/tooling, not by the model, and are charged to the executor.** PKT-0002 (×2): executor could not run acceptance, retries had no failing output (F5, F6). PKT-0004: same-family review contradiction (F8). PKT-0011, PKT-0013: R2 scope check rejected the executor log (F12). PKT-0009 (×2): `create_in: ["."]` bug, no `npm install` permission (F13, F16). 5 of these 7 are Sonnet records, which drives the Sonnet/characterize numbers above; routing decisions taken from this table would be wrong. These blocks cost $13.92 (40% of spend). *Observation on routing (11 records), finding on attribution.*

**F-D. Friction has two incompatible schemas.** F1–F11 follow spec §4.3 (`role`, `model`, `hindered/missing/unneeded` with `ref`); F12–F21 use `phase`, `kind`, `note` with no `ref`, no `role`, no `model`. The second half cannot be counted per rule as §4.3 intends. *Observation (21 lines).*

**F-E. Reviewers do not check the executor log or the Spawned packets section.** F15 (PKT-0010, PKT-0012 approved with an empty log), F18/F19 (PKT-0009 approved without the requested follow-up), F7 (PKT-0002 approved after a surprising behaviour was dropped). Root causes were partly tooling (fixed in 0.9.0), but the reviewer prompt has no check for it. *Observation (4 packets).*

**F-F. Per-file ignore lines make parallel `migrate` branches conflict.** F21: PKT-0016, 0017, 0018 all conflicted on `.gitignore`/`.prettierignore`. *Observation (3 packets); adapter-level, not core.*

**F-G. Diagnosis spec ambiguity.** F10: the matrix score direction is undefined; two diagnosticians scored DocService coupling 1 vs 4 for the same facts (PKT-0007). F9: a packet cannot request a specific executor for D3. *Observation (1 packet).*

**F-H. Large interop packets are expensive to lose.** PKT-0009 needed 3 blocked attempts ($9.70) before `--resume` (0.8.0) let it finish at first review (F14, F17). *Observation (1 packet).*

## 4. Proposals

Ordered by expected impact. Per M4, apply at most two in the next version: **TEP-0001 and TEP-0002** first, because without them no later TEP can be verified.

1. `TEP-0001` — Record the tool version and the §4.1 fields on every scoreboard record (factory). Fixes F-A, F-B.
2. `TEP-0002` — Mandatory `block_reason` with `cause: method | model | task` and exclusion of method-caused blocks from routing stats (routing). Fixes F-C.
3. `TEP-0003` — One friction schema, validated by `theseus validate` (factory). Fixes F-D.
4. `TEP-0004` — Reviewer checklist: executor log non-empty, Spawned packets matches what the packet asked (review). Fixes F-E.

Not proposed as TEPs: F-F is adapter-only (build-output convention) and F-G is a spec wording fix; both should be handled by their owners with low ceremony. F-H is already addressed by `--resume` (0.8.0) — verify in AUD-2.

## 5. What not to change

- **D3 independent second diagnosis** (F11): caught a defect the first diagnosis missed in PKT-0007.
- **Cross review**: 6 rejections over 20 done records with 0 escapes so far; reviewer cost 19% of spend. Keep until escapes data exists.
- **`--resume` on release** (F17): PKT-0009 went from 3 blocked attempts to first-review approval.
- **Spawn requests** (0.9.0, F19): keep; verify in AUD-2 that `spawned_packets` > 0 where packets ask for follow-ups.
- **Small migrate packets** (PKT-0015…0018): 4/4 first-review approval at low effort, $0.59–$1.13 each.

## 6. Limits of this audit

- Same-family auditor (see header). Run folders in `.theseus/scoreboard/runs/` were not analysed attempt by attempt; numbers come from `packets.jsonl` and `friction.jsonl`.
- 21 packets, one day, zero escape tracking time: nothing here reaches the M6 threshold for a rule-level change except the measurement findings F-A and F-B.
- Next audit: after 20 more packets under the version that applies TEP-0001/0002.
