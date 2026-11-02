You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0022, described in .theseus/queue/ (search for PKT-0022). The changes to review are `git diff 4930844c065943f741b9297ccfc08f73816b6d50..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval. If the packet asked for a follow-up packet and there is no such request, reject.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I wrote the first method audit, AUD-1, and four change proposals, TEP-0001 to TEP-0004, and committed them (`7066a6e`). The acceptance check `test -s .theseus/audits/AUD-1.md` passes.

**Two limits on this audit:**
- **Same model family:** I audited as claude-opus-5-5, the same family as every executor and reviewer in the period. The spec prefers a different family, so a second audit by a GPT model would be worth running.
- **Shell refusals:** my Python script for the numbers and some `sed`/heredoc commands were refused. I didn't work around that: I counted the indicators by hand from `packets.jsonl`. I also didn't go through `.theseus/scoreboard/runs/` attempt by attempt.

**What the scoreboard shows:** 28 records cover 21 packets. 20 records ended done, 7 blocked and 1 discarded (PKT-0019).
- **First-review approval:** 14 of 20 done records (70%).
- **Spend:** $34.59 in total. Reviews cost $6.53 of that (19%).
- **Blocked attempts:** they cost $13.92 (40% of spend), and PKT-0009 alone cost $11.26.
- **Escapes:** none, but the whole period is one day, so zero means nobody has looked yet, not that there are none.

**Main findings:**
1. **Most indicators can't be measured yet.** No record has the per-packet fields the spec requires (estimated size, context ratio, out-of-context reads, spawned packets, block reason, and others). Four of the seven indicators can't be computed.
2. **The version never changed.** Every record says `method_version 0.1.0`, although the friction log mentions tool fixes in Theseus 0.7.1 through 0.9.0. So no fix can be compared before and after.
3. **All 7 blocks came from the method or tooling, not the model.** They are still charged to the executor. Five are Sonnet records, which makes Sonnet look poor on `characterize` packets (1 of 6 approved at first review).
4. **The friction log has two formats.** Lines 12–21 lack the rule reference, role and model that the spec asks for, so they can't be counted per rule.
5. **Reviewers don't check the executor log or requested follow-ups.** Two packets were approved with an empty log, and PKT-0009 was approved without the follow-up it was asked to create.

Following the spec's sample-size rule, anything affecting fewer than 20 packets is labelled an observation. Only findings 1 and 2 are firm, because they touch every record.

**Decisions:**
- **Two proposals first:** TEP-0001 (record the tool version and all required fields) and TEP-0002 (tag each block as caused by the method, the model or the task). The spec allows at most two changes per version, and without these two no later proposal can be verified.
- **Not proposed:** the merge conflicts on ignore files (project adapter only) and the unclear diagnosis scoring direction (a wording fix). Neither is a method change.
- **No follow-up packets requested.**

**Keep as is:** the independent second diagnosis (it caught a real defect in PKT-0007), cross review, resuming a blocked packet from its branch, spawn requests, and small migrate packets (4 of 4 approved at first review).

**Lessons for the Atlas:**
- Record which tool version each packet ran under, or later audits can't tell which fixes helped.
- Mark blocks caused by the method separately from blocks caused by the model.

Both are recorded in AUD-1. I didn't write them into the packet's Atlas section.

Files are in `.theseus/`:
- `audits/AUD-1.md`
- `proposals/TEP-0001.md`
- `proposals/TEP-0002.md`
- `proposals/TEP-0003.md`
- `proposals/TEP-0004.md`
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
