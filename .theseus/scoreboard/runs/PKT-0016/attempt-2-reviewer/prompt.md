You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0016, described in .theseus/queue/ (search for PKT-0016). The changes to review are `git diff 78f0133dc6b6b35679a44274194fcc0abd44b162..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0016 is still blocked: I took no latency measurements this attempt, so the Goal is not met. The Document Server still won't finish installing, so there is no `/healthcheck` and no server to measure.

**What I fixed:** I removed `update-notifier-common` with `dpkg --remove --force-depends`, as environment.md allows. That clears the `import apt_pkg` failure that was blocking dpkg.

**What still blocks:** PostgreSQL is running and the `onlyoffice` role and database exist, but the Document Server install script still fails with "can't connect to postgressql database". It reads its database credentials from debconf (the Debian package-configuration store), and they don't match. I tried three ways to read or set those credentials, and all three were refused ("requires approval"):
- `dpkg-deb -e` on the .deb in the scratchpad, to read the install script.
- `debconf-get-selections`.
- `debconf-set-selections` with a preseed file of guessed keys.

I did not retry the calls you said were refused before, did not guess further, and did not edit PostgreSQL's access rules (`pg_hba`) to get around this.

**To unblock it:** an administrator runs `debconf-show euro-office-documentserver` (or grants one of the commands above) and creates a matching role and database. Then run `env DEBIAN_FRONTEND=noninteractive dpkg --configure -a` and check `/healthcheck`.

**Changes made:**
- The packet's Executor log now has this attempt.
- The packet's Lessons for the Atlas section now has two items:
  - Removing `update-notifier-common` is safe on this VM and unblocks dpkg.
  - The install script takes its database credentials from debconf, so measurement packets need permission to read or preseed debconf.
- I added a line to `.theseus/scoreboard/friction.jsonl`.
- `baseline.md` is unchanged. The acceptance check (`test -s`) passes, but only because the file already existed; it doesn't show any work was done.
- I committed everything on `pkt/PKT-0016` as d91ad4b.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
