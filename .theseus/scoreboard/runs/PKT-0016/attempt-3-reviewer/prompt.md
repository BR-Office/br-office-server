You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0016, described in .theseus/queue/ (search for PKT-0016). The changes to review are `git diff 1609fdd0512803904a871fb984f997ed58db14d6..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0016 is still blocked, and I took no latency measurements this attempt either.

**What I found:** the environment hasn't changed since the last attempt. The Document Server package is still only partly installed (`half-configured`), and `localhost/healthcheck` returns nothing, so there is no server to measure. The package can't finish installing until a PostgreSQL user and database exist. The only ways I have to create them (`sudo -u postgres psql`, `su postgres -c`, a python helper) were refused in earlier attempts. The run rules say not to retry or work around refused calls, so I didn't.

**What I did:**
- Added an attempt-4 entry to the Executor log in the packet saying it is still blocked and why.
- Committed that as `983c96f`.
- Ran the acceptance check `test -s .theseus/oracle/baseline.md`. It passes, but `baseline.md` was already non-empty and is unchanged. So the pass shows nothing about the Goal, which is still undone.
- Did not touch `baseline.md` or `client-perf.js`.

**Decisions:**
- I did not take the reviewer's three fixes (set up the stack, fix `environment.md`, tighten the acceptance check). The first needs the refused calls, and the other two are outside this packet's allowed files. Requests for both are still waiting in `.theseus/spawn/` from the previous attempt.
- I did not add a line to `friction.jsonl` because the packet isn't ending.

**Lessons for the Atlas:**
- Packets that need measurements should only be handed out once the stack has been set up and `/healthcheck` answers.
- An acceptance check like `test -s` on an existing file passes even when nothing was measured.

To finish this packet, someone needs to either:
- complete the provisioning request (create the PostgreSQL user and database, finish the package setup, and correct `environment.md`), or
- give the executor permission to run `psql` as the `postgres` user.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
