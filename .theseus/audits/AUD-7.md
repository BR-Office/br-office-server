# AUD-7 — Method audit, scoreboard records 140 to 164

Auditor: claude-opus-5-5 (same family as every executor and reviewer of the period; see F3). Date 2026-11-04.
Sample: 25 records, all on method 0.6.0 / tool 0.24.2: 21 done, 3 blocked (PKT-0132 twice, PKT-0133), 1 discarded (PKT-0132, after its blocks). 23 distinct packets. Unlike AUD-6, every record carries agent work (no pre-claim discards), so TEP-0015's concern did not arise in this period.

## 1. Indicators (balancing pairs)

| Part | Indicator | Value | Pair | Value |
|---|---|---|---|---|
| Packet | estimated vs actual deviation (planner source only) | 7 records (0108, 0109, 0110, 0113, 0114, 0115, 0116): median \|actual/est − 1\| on lines = 0.23 (target < 1.0). Files under-estimated on 7/7 (actual 3–7 vs est 1–3: packet, friction and spawn files are not counted by the planner) | escapes per packet | 0 (escapes.jsonl empty) |
| Packet | spawned packets per record | 9 / 25 = 0.36 | | |
| Atlas | out-of-context reads | null on 25/25 (seventh audit) | median context ratio (done) | 7.9% |
| Atlas | "missing" friction tied to Atlas/adapter/oracle | 0137 (x2, external/ not checked out, mirror path not in environment.md), 0138 (same + x2t card), 0141 (service worker not in Atlas), 0116 (no DB-count recipe), 0109, 0149 (differential case not named), 0129/0130/0141 (journey runner copied again) | | |
| Oracle | escapes `failed_component: oracle` | 0 | flakiness | `flaky_oracle` false 24/24 recorded; friction reports a non-reproducing differential fail in 0109 and 0149, and 0133 blocked on a differential fail |
| Oracle | | | acceptance run time | differential several min/run; 4 commands exceed the 10-min limit (0110) |
| Review | rejections that prevented real problems | 5 content rejections, all concrete and correct: 0135 (wrong p50), 0141 (Editor.bin 0 bytes), 0113 (unrelated hunk), 0115 (wrong code claim), 0132 (no gain beyond noise) | review cost | $6.61 of $32.42 done cost (20%; AUD-6 26%) |
| Factory | done per day | 21 (≈ one day, 2026-11-04) | first-review approval | recorded 17/21 = 81%; counting acceptance-gate rejections (0109, 0137, 0149) it is 14/21 = 67% |
| Factory | blocked cost | ≤ $5.43 of $37.85 (≤ 14%; AUD-6 60%) | median done duration | 8.9 min (AUD-6 15.6) |
| Routing | executor | claude-opus-5-5 on 16 done, claude-opus-5-5-b on 5; effort low throughout | escapes per model | 0 |

Data quality: PKT-0109, 0137, 0149 have `approved_first_review: true` with an acceptance-gate rejection in `rejection_reasons` (F4). PKT-0133 has `attempts: 1` while its block reason says "3 attempts failed". PKT-0132 has no friction line on any of its 3 records. PKT-0132's block-record costs ($1.40, $2.25) may be cumulative; blocked cost is therefore an upper bound.

## 2. Verdict on TEPs under test

- **TEP-0013 (journeys): stage-ownership half on track, speed half refuted so far.** `.theseus/scoreboard/journeys.jsonl` now exists (8 rows, AUD-6 gap closed). `open-docx-10p` p50 3662 ms (PKT-0110, 5 runs) vs target < 2.5 s; AUD-6 measured 8340 ms on a different build, so the trend is down but the bar is not met with ~15 records left of its 40-record window. No differential regression reached done. Stage ownership: 0146, 0148, 0149 friction say stage ids repeat across journeys, so "every stage has an owner" cannot be checked unambiguously (F5).
- **TEP-0012 (chore and measure types): confirmed for `measure`, unproven for `chore`.** 10 `measure` records, 8 done, first-review approval 6/8 = 75% (meets ≥ 75%). 0 `chore` packets in two periods. Missing-type friction: 2 lines (0130 "no type for a performance change", 0115 "prompt does not list valid types") vs target 0 — refuted on that half.
- **TEP-0011 (fork scope-check, stop on repeated rejection): confirmed.** R2 rejections on `external/`: 1 in 25 (PKT-0133, target ≤ 1). Blocked cost ≤ 14% (target < 10%, AUD-6 60%): close, not met. No file outside a target reached done.
- **TEP-0001 (block on external rejection): confirmed, with cost.** PKT-0132 reached the same "within noise" verdict at attempt 2 and again at attempt 4; the first two rejections called it a missing gain, not an external blocker, so 2 extra attempts ran (same pattern as 0111 in AUD-6).
- **TEP-0004 (friction lines): met for done (21/21), missed for blocked (1/2 packets: 0132 none).**
- **TEP-0006 (planner estimate): improved, still under target.** Planner source on 7/25 = 28% (target ≥ 80%; AUD-6 31%). Where present, the line estimate is good (median deviation 0.23).
- **TEP-0009 (spawn lint): one miss.** PKT-0133 spawn request reached the gate with placeholders (R6 rejection).
- **TEP-0014, TEP-0015:** still `proposed`, not under test. PKT-0132 is a second instance of TEP-0014's problem (perf bar below VM noise, see O1).

## 3. Findings (≥ 20 records)

**F1. `out_of_context_reads` null for the seventh audit (atlas).** 25/25. Proposed again in TEP-0016: remove the field from §4.1 or have the factory compute it.
**F2. `flaky_oracle` never true while flakes are reported (oracle).** 0109 and 0149 rejected on differential differences that "do not reproduce on an unchanged fork"; the rejection text quotes only the summary line, so neither agent nor reviewer can tell a flake from a regression. → TEP-0017.
**F3. Same-family execution, review and audit (review).** 25/25 records use claude-opus-5-5 and claude-opus-5-5-b for both roles. Human decision, recorded again.
**F4. `approved_first_review` ignores gate rejections, fourth audit (factory).** 0109, 0137, 0149 here; AUD-4/5/6 the same. → TEP-0016.
**F5. Planner file estimate excludes method files (packet).** 7/7 planner records under-estimate files by 1–5; 0109 friction: `max_files_changed` counts packet, friction and spawn files. Lines are fine. (Observation-level for the rule, finding-level for the data: covered by TEP-0016.)

## 4. Observations (< 20 records)

- **O1. Perf bars below VM noise, again.** PKT-0132: 4 attempts, −84 ms gain inside −252…+286 ms spread, then "~25 ms change below the ~40 ms this VM can measure"; discarded. 0150 friction: perf runs at load 10–13. This is TEP-0014's case; approving it would have saved ≤ $3.65.
- **O2. Worktree does not provide `external/` repos the oracle needs.** 0137 (3 attempts), 0138; mirror path missing from environment.md. Project/adapter gap → spawn request filed (journey/external setup).
- **O3. Journey runner copied per journey.** 0129, 0130, 0141 (and 0127 in AUD-6). Project gap → spawn request filed.
- **O4. Pending packets of an earlier round confuse round planning.** 0146, 0148, 0149 friction. 3 records; watch next audit.

## 5. Proposals

1. **TEP-0016** (factory): `approved_first_review` false on any rejection including gates; `out_of_context_reads` removed from required fields; planner file estimate counts method files. From F1, F4, F5.
2. **TEP-0017** (oracle): a failing differential prints every differing case/check and reruns only those once; a pass on rerun sets `flaky_oracle: true`. From F2.

## 6. What not to change

- **Fork scope-check (TEP-0011).** R2 on nested clones stayed at ≤ 1 (7 → 0 → 1 across AUD-5/6/7).
- **Precise reviewer rejections.** 5/5 content rejections were correct and specific; friction of 0113, 0115, 0135 says the rejection made the fix a direct one. Review cost fell to 20%.
- **`measure` packet type (TEP-0012).** 10 records, 75% first-review approval, median cost ~$1.4.
- **Journeys scoreboard (TEP-0013).** journeys.jsonl now gives the audit numbers without reading markdown.
- **Work preservation (TEP-0010).** 0110 and 0128 friction: resumed attempts kept their work.
- **Friction lines on done packets.** 21/21; every observation above cites them.
