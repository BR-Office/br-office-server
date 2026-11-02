You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0020, described in .theseus/queue/ (search for PKT-0020). The changes to review are `git diff 6a53ae6853161da142c85c987fe0f7ee8ded1627..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I wrote the audit report and four improvement proposals for PKT-0020 and committed them as `1027d91`. The acceptance check (`test -s .theseus/audits/AUD-1.md`) passes, and `theseus validate` reports 0 errors and 1 warning; I didn't look into what the warning is.

**What the audit found**

The 22 scoreboard records cover 18 distinct packets: 10 done, 7 discarded, 5 blocked. No method rule touched 20 or more packets, so under the auditor rules every result is an observation, not a finding.

- **Outside dependencies drive the failures.** All 7 packets that passed on the first review only needed the repository. Every first-review failure and every costed block needed something outside it: a running Document Server, the GitHub API, or a file outside the packet's target.
- **Retrying didn't help with blockers.** In PKT-0002, PKT-0016 and PKT-0017, every rejection repeated the same blocker, and only a human or the factory could remove it. Records that ended blocked cost $7.34, which is 38% of the period's $19.44 total.
- **Acceptance checks only test that a file exists.** In PKT-0016 the check passed while the file held no measurements. This packet's own check has the same weakness.
- **Review worked, but it isn't cross-family.** All 14 rejections named a real unmet goal, and there were no escapes. The reviewer (`claude-opus-5-5-b`) is the same family as the executor (`claude-opus-5-5`), which goes against the cross-family rule unless pilot mode is on. I didn't check whether it is. This audit was also run by the same family, which the measurement spec advises against.
- **Several indicators can't be computed.** `estimated`, `context_ratio`, `out_of_context_reads` and `flaky_oracle` are empty in every record, so the packet and Atlas indicators are missing. Only 3 of the 15 friction lines were written by an agent; the other 12 are lists of refused commands from the factory.
- **Zero escapes proves little yet:** the period produced no production code, only investigation and characterisation packets.

**Proposals**

- **TEP-0001:** block a packet on the first rejection that names an external blocker, instead of spending two more attempts.
- **TEP-0002:** let a packet declare the resources it needs and check them before an agent claims it. Also allow plain read commands like `cat`, `ls` and `grep` by default.
- **TEP-0003:** require at least one acceptance command that checks the goal's actual content.
- **TEP-0004:** fill the indicator fields, and refuse delivery until the agent has written its own friction line.

The report also lists what should not change: goal-focused review, strict targets with spawn requests, small investigation packets, and the 3-attempt limit.

**What I left out**

- I made no spawn requests, because everything I found is a gap in the method, not in the project.
- I did not read the run folders in `scoreboard/runs/` or each packet's log in depth. The numbers come from `packets.jsonl` and `friction.jsonl` only.
- Python heredocs and some `sed` commands were refused by permissions. I used the file-editing tool instead and did not work around the refusals.

**Lessons for the Atlas**

- Record the scoreboard fields that the indicators need, otherwise audits are partly blind.
- Plan packets that depend on outside resources separately, with a check that the resource works before an agent is sent.

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
