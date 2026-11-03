# AUD-4: Method audit, scoreboard records 77 to 96

- Auditor: claude-opus-5-5 (packet PKT-0088). Same family as every executor and reviewer of the period (pilot mode); independence weakened, as in AUD-2 and AUD-3.
- Records: lines 77 to 96 of `packets.jsonl` (20 records, 18 distinct packets: PKT-0065, 0066, 0068 x2, 0069, 0071, 0072, 0073, 0074, 0075, 0076, 0077, 0078 x2, 0079, 0080, 0081, 0082, 0083, 0086). Friction lines 80 to 97 (18 lines). Escapes: 0.
- Versions: `method_version` 0.1.0 on 20/20; tool 0.16.3 (2), 0.16.4 (7), 0.17.1 (6), 0.18.0 (5). Method 0.2.0 (TEP-0001..0004) and 0.3.0 (TEP-0006..0008) were approved on 2026-11-02 and 2026-11-03, and 0.3.0 ships with tool 0.19.x: **no record of this period ran under 0.3.0.** The 0.2.0 TEPs were active in the tool from 0.16 on, so they are judged on this period; TEP-0006, 0007 and 0008 get no verdict (sample 0).

## 1. Period scoreboard (compared with AUD-3)

Outcomes: 14 `done`, 6 `blocked` (PKT-0068 #1, 0078 #1, 0080, 0081, 0083, 0086), 0 discarded. Total $27.12: done $19.55 (median $1.15, median 6.4 min), blocked $7.57 (median $1.08, 28% of spend).

| Part | Indicator | AUD-4 | AUD-3 | Balancing pair | AUD-4 | AUD-3 |
|---|---|---|---|---|---|---|
| Packet | Actual / estimated diff (done) | median 14%; no overrun. `source: budget` 20/20 | 27%, budget 22/22 | Escapes per packet | 0 | 0 |
| Packet | Spawned per done packet | 9/14 = 0.64 | 0.63 | | | |
| Atlas | Out-of-context reads | null 20/20 (4th audit running) | null | Context size | mean 7.4%, max 15.5% (PKT-0072) | 7.5%, max 13.0% |
| Atlas | "missing" friction tied to Atlas/environment | 2 (PKT-0069 patched-sdkjs recipe, PKT-0066 tooling checkouts) | 2 | | | |
| Oracle | Escapes, `failed_component: oracle` | 0 | 0 | Acceptance run time | not recorded | not recorded |
| Oracle | Flaky oracle field | false 20/20, yet PKT-0068 #2 rejected on a flaky `unit.sh` | 0/22 | | | |
| Review | Rejections that prevented a real problem | PKT-0078 (3 concrete rejections: goal not met 124.8→175.5 ms, unrecorded commit), PKT-0065, PKT-0066 R2 gitlink | 4 | Review cost | $4.60 of $27.12 (17%) | 22% |
| Review | Escapes, `failed_component: review` | 0 | 0 | | | |
| Diagnosis | Reverted verdicts | 0 | 0 | Gain in migrated modules | none measured | none |
| Factory | Done per day | 13 (11-02), 1 (11-03) | 16 | First-review approval | 12/14 = 86% (PKT-0065, 0078 #2 not) | 81% |
| Factory | Blocked cost share | $7.57 (28%) over 6 records | $5.91 (21%) | | | |
| Factory | Permission denials per record | 1/20 (PKT-0069) | 0 | | | |
| Routing | Cost/approval per model | opus-5-5 executes 19, opus-5-5-b 1 (PKT-0086, blocked); effort `low` 20/20 | | Escapes per model | 0 | 0 |

Data quality: `approved_first_review: true` coexists with non-empty `rejection_reasons` on PKT-0068 #2, 0069, 0075, 0066 (factory-side R6/R2 rejections before review). The approval indicator therefore counts only reviewer verdicts; the factory gate rejections are invisible in it.

## 2. Verdict on hypotheses under test

- **TEP-0001 (block on first external rejection): holds for external blocks, but blocked cost rose.** The two external blocks stopped at attempt 1 (PKT-0068 $0.54, PKT-0083 $1.18). Cost per blocked record went $0.99 (AUD-3) → $1.26 (AUD-4), driven by `packet#R3` blocks after 3 attempts on a deterministic placeholder (PKT-0080 $1.44, 0081 $0.97, 0086 $0.77) and PKT-0078 #1 (4 attempts, $2.67). The rule works; what grew is a class it does not cover (deterministic acceptance failure). Keep `confirmed` for the external rule; see TEP-0009.
- **TEP-0002 (environment preflight): lacks data.** 0/20 records carry `requires`. Second audit at sample 0. PKT-0068 #1 blocked exactly on an environment (DocService :8080) that a preflight should have named. Recommend: either the planner must write `requires` or mark TEP-0002 `refuted` for non-use at AUD-5.
- **TEP-0003 (acceptance checks the Goal): still not supported.** PKT-0073 friction: "investigate packet with empty acceptance: nothing machine-checks the result"; PKT-0078's goal failure (timing got worse) was caught by review, not acceptance. Depends on TEP-0008, which has no records yet. Hold one more period.
- **TEP-0004 (indicator fields, agent friction): met on done, missed on blocked again.** 14/14 done packets have a friction line; 0/4 packets that ended blocked (PKT-0080, 0081, 0083, 0086) have one, second audit running (AUD-3: 0/6). `out_of_context_reads` null for the fourth time. The blocked-friction gap is now 10 packets across two audits: treat as a finding under TEP-0004, not a new TEP — the factory should write a `source: factory` friction line from `block_reason` on every block.
- **TEP-0006, 0007, 0008: no data** (no 0.3.0 records). Verdict at AUD-5.

## 3. Findings (≥ 20 records affected)

**F1. `method_version` is 0.1.0 on 20/20 records although 0.2.0 was approved before most of them (measurement).** Third audit running (AUD-2 F2, AUD-3 F1). TEP-0006 is now in testing with tool 0.19; AUD-5 must check that its first records carry 0.3.0, otherwise TEP-0006 is refuted.

**F2. `estimated.source: budget` on 20/20 (packet).** The deviation indicator stays meaningless (median 14% of a fixed 800/1500 budget). Covered by TEP-0006; same check at AUD-5.

**F3. Same-family review on 14/14 reviews (review).** Recorded; human decision.

## 4. Observations (fewer than 20 packets)

- **O1. One placeholder cascaded into four blocked packets.** PKT-0080's acceptance `node .theseus/oracle/perf/profile-fonts.js <samples-dir> …` failed 3 times; PKT-0081 was issued with the same placeholder; the two fix packets PKT-0083 and PKT-0086 then blocked (target pointing at `queue/in-progress/` while the file was in `queue/blocked/`; acceptance `test -f` on a file outside the worktree). $4.36, 22% of the period's spend, zero output. TEP-0007 lints only `[UPPERCASE]` placeholders; `<lowercase-word>` would pass it. → TEP-0009.
- **O2. Spawn requests still leave template placeholders.** 5 factory rejections on R6 (PKT-0068, 0069, 0075, 0080, 0083) and 2 friction lines (PKT-0068, 0075). → TEP-0009 (lint spawn requests too).
- **O3. Work lost between attempts.** PKT-0068 (attempt-1 diff missing after restart), PKT-0066 (commit d46dde8 in external/sdkjs lost), PKT-0078 (nested clone reset, commits re-applied; 4 attempts and 41 min), PKT-0071 (packet named rebased SHA d46dde8), PKT-0065 (VM state from earlier attempts unrecorded). 5 packets. Tool 0.18.0 fork branch helped (PKT-0078 friction). → TEP-0010.
- **O4. Narrow targets (AUD-3 O1) persist.** PKT-0065, 0069, 0073, 0075, 0077, 0071 friction cite empty `target.files`/`create_in`. TEP-0007's warning should cover it; check at AUD-5.
- **O5. No flake signal in the oracle.** PKT-0068 rejected on a flaky `request.tests.js` timeout while `flaky_oracle` stayed false.
- **O6. Retries on deterministic failures.** PKT-0080, 0081, 0086: identical acceptance output 3 times. → TEP-0009.

## 5. Proposals

1. **TEP-0009**: extend the packet lint to angle-bracket placeholders and to spawn requests, and block at attempt 1 when acceptance fails with the same output as a command that cannot run (packet, oracle). From O1, O2, O6.
2. **TEP-0010**: preserve each attempt's work (worktree and nested clones) on a branch the next attempt and the reviewer start from (factory). From O3.

## 6. What not to change

- **Blocking at once on external rejections (TEP-0001).** PKT-0068 #1 and PKT-0083 stopped at attempt 1.
- **Concrete review rejections.** PKT-0078's reviewer measured the goal (124.8→175.5 ms) and stopped a regression from being approved; PKT-0066's R2 rejection caught a stray gitlink.
- **Agent friction on done packets (TEP-0004).** 14/14; O1-O5 all come with ids from it.
- **Strict targets plus spawn requests.** No file outside a target slipped through; the R2 gate rejected PKT-0066 and PKT-0083.
- **Detailed Executor logs and `environment.md`.** PKT-0066 ("the detailed Executor log made re-implementation quick"), PKT-0068, 0071, 0075 credit them; they are what saved O3's lost attempts.
- **Packets that name exact keys and prior notes.** PKT-0076, 0079, 0082 report one-step fixes thanks to them.
