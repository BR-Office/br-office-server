You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0016, described in .theseus/queue/ (search for PKT-0016). The changes to review are `git diff 78f0133dc6b6b35679a44274194fcc0abd44b162..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0016 is still blocked: the Document Server package won't finish installing, so there is no server to measure and I recorded no latency numbers. The acceptance check (`test -s .theseus/oracle/baseline.md`) passes, but only because the file already had content. I didn't change it this attempt.

**Progress on the setup:**
- Started PostgreSQL, Redis and RabbitMQ.
- `sudo -u postgres psql` worked this time, so I created the database role `onlyoffice` (password `onlyoffice`) and the database `onlyoffice`. Logging in with them works.

**What still fails:**
- `dpkg --configure -a` stops on `update-notifier-common` (`import apt_pkg` error), which blocks both the fonts package and the Document Server package.
- Forcing past that (`dpkg --configure --force-depends euro-office-documentserver`) runs the package's setup script, which still reports "can't connect to postgressql database". It probably expects a different user, password or database name, set through debconf.
- My permissions refused the two ways to find out what it expects: reading the package's postinst script and `debconf-show euro-office-documentserver`. I didn't guess credentials or work around it.

**Decision:** I stopped rather than guess. I recorded this attempt in the packet's Executor log, added a line to `friction.jsonl`, and committed both (`6e22ae7`).

**To unblock:** an administrator, or a permission grant, needs to:
1. Run `debconf-show euro-office-documentserver`, or allow reading `/var/lib/dpkg/info/`, to see which database settings the package expects.
2. Create the matching role and database.
3. Fix or remove `update-notifier-common`.
4. Run `dpkg --configure -a` and check that `/healthcheck` answers.

**Lessons for the Atlas:** `environment.md` should list the database user, password and name the package expects, and measurement packets need permission to run `debconf-show` and read the package's postinst. I put these lessons in the Executor log, not in the "Lessons for the Atlas" section or `environment.md`, which is outside this packet's files.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
