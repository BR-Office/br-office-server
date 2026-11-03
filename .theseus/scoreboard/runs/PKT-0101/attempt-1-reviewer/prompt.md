You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0101, described in .theseus/queue/ (search for PKT-0101). The changes to review are `git diff ec7efd47c7a2eef5d775372e0237bbd439940451..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I finished the round 2 diagnosis of `common`. The verdict stays **keep**, and it is no longer conditional. All 5 acceptance commands pass, `theseus scope-check` is clean, and the work is committed as `0cf5206`.

**What round 1 proved:** its only packet, PKT-0026, met the condition the keep verdict depended on. Common's own code is 3–4 % of DocService CPU, 15–25 % counting what it calls, and about 1 % of wall time. In a conversion it costs about 4.6 ms out of 125–1 000 ms. That is well under the thresholds that would have moved it to refactor (20 % of CPU, or 10 ms p50 of a step users wait on).

**What it did not deliver:** nothing toward the goal. Round 1 was measurement only, by design.

**Round 2 measurements** (in `.theseus/oracle/rounds/common-r2.md`):
- **Original against new:** no code in `Common/` has changed since round 1 (`git log 5ad1b11..HEAD -- Common/` is empty), so the comparison is equal by construction. I ran the unit tests as the regression check instead: 178 passed, 1 skipped, 1 failed. The failure is `mailService.tests.js`, which needs internet DNS (`ENOTFOUND api.nodemailer.com`) that this VM doesn't have, so it is not a defect in Common.
- **Hot paths** (`bench-hotpaths.js`): format detection takes 0.25–0.91 µs, the same as the baseline.
- **Co-edit load** (`load-coedit.js` with 50 documents × 5 clients): broadcast takes 4 ms p50 and 78 ms p99, with no errors and DocService at 0.19 core. The baseline was 4 ms p50 and up to 70 ms p99. I did not re-profile Common's share of CPU, because its code has not changed.

**Decisions:**
- The round 2 plan is empty (`packets: []`).
- No follow-up packets requested: the failing mail test and the DEBUG log level are environment issues, not Common work.
- `DIAG-common-b.md` did not exist, so there was nothing to `git rm`.

The executor log and friction line are written.

**Lessons for the Atlas:**
- Logging is still at DEBUG on this VM. PKT-0026 found DEBUG adds about 50 % to DocService CPU under co-edit load, so any later measurement should switch to WARN first, or state the level.
- `mailService.tests.js` always fails here because it needs internet DNS. It should be noted as an environmental failure in the unit tests.
- When an earlier round changed no code, the "original against new" comparison has nothing to compare, and the round reduces to a regression check.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>

Environments that are up right now (the factory just ran these checks and they passed; .theseus/adapter/environment.md says how to use them):
- `documentserver`: `curl -sf http://127.0.0.1/healthcheck`
- `browser`: `node -e "require('playwright')"`
Do not report one of these as missing: use it, and if a script points elsewhere (another port, a container), point it here. If you still cannot reach it, say exactly what you ran and what came back.
