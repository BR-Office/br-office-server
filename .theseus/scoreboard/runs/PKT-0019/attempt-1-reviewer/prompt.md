You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0019, described in .theseus/queue/ (search for PKT-0019). The changes to review are `git diff 6f1e71ec9d83b297cf73efbe89766d62ab5d74e0..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I added the working native install recipe to `.theseus/adapter/environment.md`. The acceptance command `grep -q 'ds/db-pwd'` passes, and the work is committed as `ce8ceb2`.

**What changed:**
- **New recipe section:** a subsection called "Working install recipe", with the six steps from PKT-0016:
  1. Set the database password through debconf (`ds/db-pwd`).
  2. Create the PostgreSQL user and database `ds`.
  3. Start postgresql, redis-server and rabbitmq-server, then run `dpkg --configure -a`. The last step exits 1 because it calls `systemctl`, and that is expected.
  4. Start docservice, converter and example by hand as user `ds`, using the settings in their systemd unit files.
  5. Set `allowPrivateIPAddress` in `local.json` and restart nginx.
  6. Check `/healthcheck` and the example page.
- **Corrected start instruction:** the old text said to start the processes with `supervisorctl` "if the package uses it". The package doesn't, so it now points to the recipe.

**Decisions:**
- I copied the recipe from the packet as given and did not re-run the install. This packet only records what PKT-0016 found.
- I added a note that after a VM restart, only the service starts, the by-hand process starts and nginx are needed. I worked that out from the steps and did not test it; the note doesn't say so, so it may need a marker or a test.
- Besides `environment.md` (the only file in `target.files`), the commit also touches two other files. Both are allowed by the rules: the Executor log in the packet, and a line appended to `.theseus/scoreboard/friction.jsonl`, as AGENTS.md requires.

**Not done:** I didn't run `theseus validate`, and no permission was refused.

**Lesson for the Atlas:** the native package has no supervisor setup. The systemd unit files under `/usr/lib/systemd/system/ds-*.service` are the only reference for how to start the processes, and the install's last step always exits 1 on this machine because there is no systemd.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
