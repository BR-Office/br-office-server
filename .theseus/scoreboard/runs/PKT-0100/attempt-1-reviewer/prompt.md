You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0100, described in .theseus/queue/ (search for PKT-0100). The changes to review are `git diff 4505526e703155d56fffe7053f75a2a06a799c6f..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've written the audit for scoreboard records 97 to 118. It's in `.theseus/audits/AUD-5.md` with two new proposals, TEP-0011 and TEP-0012. Both acceptance commands pass, `theseus validate` shows 0 errors (2 warnings), and the work is committed as `a66d9de`.

**The period:** 22 records: 16 done, 5 blocked, 1 discarded. Total spend was $23.81, and $5.31 of it (22%) went to blocked packets. Reviewers approved 12 of the 16 done packets on first review (75%).

**Verdicts on the proposals under test:**
- **Holding:** blocking on an external rejection (TEP-0001; no case this period) and the packet lint (TEP-0007). No packet was blocked for a placeholder this period, and spawn requests got no placeholder rejections (down from 5).
- **Half confirmed:**
  - TEP-0006: every record now carries a method version that is in the changelog, but none carries a planner estimate.
  - TEP-0009: the placeholder part works, but the "stop on a repeated failure" rule only covers acceptance output. Four packets (PKT-0085, 0087, 0058, 0090) still spent 3 attempts each on the same out-of-target (rule R2) rejection.
  - TEP-0004: every done packet has a friction line, but `out_of_context_reads` is still empty on all records.
- **Refuted:**
  - TEP-0002: never used; no record in the period declares `requires`.
  - TEP-0003 and TEP-0008: first-review approval was 75% against a target of at least 92%.
  - TEP-0010: 5 packets still report lost work, and out-of-target rejections rose from 2 to 7. The commit meant to preserve each attempt's work caused several of them by committing a folder the oracle creates (`.theseus-addons`).

**New proposals:**
- **TEP-0011:** check the scope of the nested `external/sdkjs` clone against the commit it was set up from, not origin/main, and skip the `.theseus-addons` folder. Executors also get a scope check they can run before delivering, the factory sets up `external/sdkjs.base` itself, and a packet stops after the second identical gate rejection.
- **TEP-0012:** add `chore` and `measure` packet types. Three packets had to be filed under the wrong type.

**What not to change:** the packet lint, method versioning, concrete reviewer rejections, friction lines, detailed Executor logs, cached builds and resume, and packets that name the exact cause and fix.

**Decisions:**
- I took the 22 records on lines 97 to 118 as the sample.
- I counted factory gate rejections separately from reviewer verdicts, because `approved_first_review` ignores the gate.
- I judged the parts of TEP-0006, 0009 and 0010 separately because they came out differently.
- The nested-clone problem touched only 7 records, so it is recorded as an observation (fewer than 20) rather than a finding.
- I filed no follow-up packet. The missing `external/sdkjs.base` setup was already filed as PKT-0099 and discarded as factory work, so TEP-0011 now covers it.

**Limits:** I couldn't compute the estimate deviation or the out-of-context reads, because those fields are empty or only hold budget values. I'm from the same model family as every executor and reviewer this period, because no other family was available.

**Lesson for the Atlas:** most of this period's blocked cost came from how the factory checks the nested `external/sdkjs` clone, not from the code itself. The Executor log, the lesson and my friction line are in the packet and in `friction.jsonl`.
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
