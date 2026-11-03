You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0088, described in .theseus/queue/ (search for PKT-0088). The changes to review are `git diff ace6131f69aab90c6a7c0496633e4e8537c73c39..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've written the audit of scoreboard records 77 to 96 in `.theseus/audits/AUD-4.md` and two new proposals, `TEP-0009` and `TEP-0010`. Both acceptance commands pass, `theseus validate` reports 0 errors and 1 warning, and the work is committed as `1338306`.

**What the audit found**
- **The period:** 20 records covering 18 packets: 14 done, 6 blocked, 0 escapes. First-review approval was 86% (81% last audit). Blocked packets took 28% of the $27.12 spent (21% last audit).
- **No data yet for TEP-0006, 0007 and 0008.** Every record in the period ran on tool 0.18.0 or older and carries method version 0.1.0. Version 0.3.0 only arrives with tool 0.19, so these get a verdict at AUD-5.
- **TEP-0001 (block on the first external rejection):** it still works. Both external blocks stopped at the first attempt. Cost per blocked record still rose from $0.99 to $1.26, because of a kind of failure the rule doesn't cover.
- **TEP-0002 (environment check before running):** no record used `requires` for the second audit in a row. If that is still true at AUD-5, I recommend marking it refuted.
- **TEP-0003 (acceptance checks the Goal):** still not supported; it is held one more period until TEP-0008 has records.
- **TEP-0004 (friction lines):** met for done packets (14 of 14), missed again for blocked ones (0 of 4).
- **One placeholder blocked four packets.** PKT-0080's acceptance command contained a leftover `<samples-dir>` and failed three times with the same output. PKT-0081 copied it, and the two packets meant to fix it (PKT-0083, PKT-0086) blocked too. That cost $4.36 with nothing delivered. TEP-0007's check only catches `[UPPERCASE]` placeholders, so it would have missed this one.
- **Work lost between attempts** in 5 packets (PKT-0065, 0066, 0068, 0071, 0078), mostly commits in the nested `external/sdkjs` clone that were reset away.
- **A data problem:** `approved_first_review` is true on four records that the factory had rejected before review (PKT-0066, 0068, 0069, 0075). The approval rate only counts reviewer verdicts.

**New proposals**
- **TEP-0009:** check for every placeholder form, including in spawn requests, and block at once when an acceptance command fails twice with identical output.
- **TEP-0010:** save each attempt's work, nested clones included, on attempt branches, and make packets refer to branches instead of commit hashes.

**What not to change:** blocking at once on external rejections, concrete review rejections (PKT-0078's reviewer measured a slowdown from 124.8 to 175.5 ms and refused it), friction lines, strict targets, detailed Executor logs, and `environment.md`.

**Decisions:** I judged TEP-0001 to 0004 on this period because the tool has carried them since 0.16, even though the records say 0.1.0. I didn't need any follow-up packets. I filled in my packet's Executor log and appended my friction line.

**Lessons for the Atlas:**
- An audit planned by record count can land before a new method version has any records.
- Placeholder checks have to cover every syntax, not just `[UPPERCASE]`.
- Work in nested clones is lost between attempts unless the factory saves it.

**Could not do:** two indicators stay empty because the data isn't recorded: out-of-context reads and acceptance run time.
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
