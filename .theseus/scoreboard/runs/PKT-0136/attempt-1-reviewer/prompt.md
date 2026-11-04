You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0136, described in .theseus/queue/ (search for PKT-0136). The changes to review are `git diff d63036a7510b72f23132d3abcb950a1d4089db46..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've written the audit to `.theseus/audits/AUD-6.md` and committed it along with two new proposals. Both acceptance commands pass, and so do `theseus scope-check` and `theseus validate` (0 errors, 4 warnings).

**The sample is mostly too small for firm conclusions.** Records 119–139 cover PKT-0100…0127: 10 done, 3 blocked and 8 discarded. You discarded those 8 (PKT-0117…0124) by hand before any agent ran them, so only 13 records show actual work. Under the "fewer than 20 records" rule, most points are recorded as observations rather than findings.

**Verdicts on the proposals under test:**
- **TEP-0011 (scope-check for nested clones):** the main half is confirmed. Rejections for touching files under `external/` fell from 7 last audit to 0. The cost half is refuted: blocked packets took 60% of spend, against a target under 10%. The cause has changed, though (see below).
- **TEP-0012 (`chore` and `measure` packet types):** too few uses to judge. There were 2 `measure` packets and no `chore` packet; the minimum is 3 of each.
- **TEP-0013 (user journeys):** not measurable yet. The 10-page open is at 8.3 s against a 2.5 s target. Its "How to verify" points to `.theseus/scoreboard/journeys.jsonl`, which doesn't exist; the numbers are only in `.theseus/journeys/*.md`.
- **TEP-0004 (friction lines):** every done packet has one, but none of the 3 blocked packets do.
- **TEP-0006 (planner estimates):** still refuted. Only one record can be used to compare estimate and actual size.
- **TEP-0001 (block on an external blocker):** confirmed. PKT-0111 still used 3 attempts, because the first two rejections didn't use the word "external", so the rule only fired on the third.
- **TEP-0009 (placeholder checks):** one regression. PKT-0127's follow-up request reached review still containing template placeholders.

**What blocked work this period:** PKT-0108, 0111 and 0112 had performance goals that couldn't be reached by changing only their allowed files. That cost $15.30, or 60% of spend, and nothing was delivered. Reviewers caught it each time; planners never checked for it.

**New proposals:**
- **TEP-0014:** a goal with a numeric target must state how it will be measured (for example paired runs and how many), and must list every file the change needs.
- **TEP-0015:** packets discarded before anyone takes them don't count toward the 20 records that trigger an audit.

**Not to change:** the scope-check for nested clones, reviewers' "external blocker" verdicts, keeping work across restarts, detailed Executor logs, friction lines on done packets, and placeholder checking.

**Decisions I made:**
- I based the analysis on the 13 records that ran, not all 21.
- I counted PKT-0127 as not approved on first review even though its record says `true`, because it has a rejection on file. This is the third audit where that field disagrees with the rejections.
- I raised no follow-up packet requests. The project gaps the friction lines mention (a shared journey runner, a performance script for the fork build) are already where planners will see them.

**Lessons for the Atlas:**
- Performance goals on the shared VM need paired measurements over many runs; timings vary by 20–60% between runs.
- The `flaky_oracle`, `approved_first_review` and `out_of_context_reads` fields still don't reflect what happened, so the indicators had to be rebuilt by hand from the text.
- The executor, reviewer and auditor were all from the same model family again this period.

I've added notes to the Executor log of PKT-0136 and appended a friction line. No command was refused.
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
