You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0016, described in .theseus/queue/ (search for PKT-0016). The changes to review are `git diff 78f0133dc6b6b35679a44274194fcc0abd44b162..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0016 is still not done: I took no latency measurements and left `baseline.md` unchanged. The Document Server still won't install, because its setup script can't connect to PostgreSQL.

**What I did**
- Confirmed PostgreSQL is running and re-ran the package configuration non-interactively.
- The fonts package now configures. Its licence was not accepted, so the Microsoft fonts are missing.
- The Document Server package still stops with "ERROR: can't connect to postgressql database". Its setup takes the database username and password from debconf, and those don't match the `onlyoffice`/`onlyoffice` role I created in attempt 5.
- I tried to find the expected database username in the PostgreSQL log (`tail /var/log/postgresql/...`). That was refused because the file is outside the worktree.
- I did not retry any call refused in earlier attempts and did not work around them. In particular, I did not read the files through psql's `pg_read_file`.
- I wrote these steps in the packet's Executor log and committed them as `docs(PKT-0016): …`. The acceptance command `test -s .theseus/oracle/baseline.md` passes, but the file was already non-empty, so the pass says nothing about whether the goal was met.

**What I could not do**
- The whole goal: the open-time breakdown, the cause of the slow remote-apply tail, and the large docx/xlsx/pptx samples.
- I did not add a line to `.theseus/scoreboard/friction.jsonl`, because the packet hasn't ended.

**To unblock**
An administrator runs `debconf-show euro-office-documentserver` and creates the database user and database it names. Then `env DEBIAN_FRONTEND=noninteractive dpkg --configure -a` should finish, and `/healthcheck` should respond. The alternative is to let measurement packets read `/var/lib/dpkg/info` and `/var/log/postgresql`.

**Lessons for the Atlas**
- Being allowed to run administrator commands isn't enough here. Debconf answers and system logs are read-protected, so a measurement packet can't finish this install. An administrator should install the server before the packet runs.
- `--force-depends` gets past the missing `update-notifier-common`, but the database step still fails.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
