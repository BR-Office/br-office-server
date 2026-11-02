You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0016, described in .theseus/queue/ (search for PKT-0016). The changes to review are `git diff 1609fdd0512803904a871fb984f997ed58db14d6..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I took no measurements for PKT-0016: I couldn't get the Document Server running on the VM, so the packet's goal is not done. The acceptance check (`test -s .theseus/oracle/baseline.md`) passes, but only because `baseline.md` already had content. It says nothing about the goal.

**What blocked the server setup:**
- Docker is no longer on the VM, so I downloaded the native package as `environment.md` says (610 MB `.deb`).
- `apt-get install` failed on another package, `update-notifier-common`, whose install script hits a Python mismatch (`apt_pkg`). That left the Document Server package unconfigured.
- Forcing the configure step without `DEBIAN_FRONTEND=noninteractive` hung on a prompt; I stopped it after 10 minutes. With that variable set it got to "can't connect to postgressql database".
- PostgreSQL and Redis started. RabbitMQ isn't installed, and nginx fails to start.

**What I didn't do:** my permissions refuse `psql`, reading files outside the worktree, `grep`/`ls` and compound shell commands. Getting further would need several of these: reading the package's install script, creating the database user and database, installing RabbitMQ and fixing nginx. Following the run rules, I didn't work around the refusals (for example by running shell steps through `node -e`).

**Decisions:**
- I left `client-perf.js` unchanged and recorded no numbers.
- In `baseline.md` I changed only the client-latency row in the Gaps table, so it records this attempt and the blocker.
- The executor log in the packet has the full sequence of commands and errors.
- I didn't append to `friction.jsonl`: it is outside the target, and it has been the factory's own scoreboard commit for earlier packets.
- Everything is committed as `e003767`.

**Lesson for the Atlas:** `environment.md` is wrong that one `apt-get install` sets up the native package on this VM. Before this packet is retried, either the stack has to be set up in advance, or the executor needs permissions for `psql` and for reading `/etc` and `/var/lib/dpkg`.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
