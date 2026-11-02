You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0016, described in .theseus/queue/ (search for PKT-0016). The changes to review are `git diff 1609fdd0512803904a871fb984f997ed58db14d6..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I couldn't do PKT-0016 again: no latency measurements were taken. The Document Server still won't start because I wasn't allowed to create its PostgreSQL user and database. The acceptance check (`test -s .theseus/oracle/baseline.md`) passes, but only because that file already has content, not because anything was measured.

**What I got working:**
- PostgreSQL and Redis start with `service`.
- RabbitMQ was missing. `apt-get install -y rabbitmq-server` installed it and it now starts.

**Where it stopped:** `sudo -u postgres psql -c "CREATE USER ..."` and `su postgres -c psql ...` were refused ("requires approval"). I didn't try to get around that. Without the database, the package's setup step can't finish, so the package is still `half-configured` and the server can't be checked or measured.

**Decisions:**
- You asked me to fix `environment.md` and make the acceptance check require real numbers. Both files are outside what this packet may change, so I filed two requests in `.theseus/spawn/`:
  1. Set up the full stack and rewrite `environment.md` with the steps that actually work.
  2. Replace PKT-0016's acceptance check with one that needs a results file under `.theseus/oracle/perf/` holding real timings for docx, xlsx and pptx.
- `baseline.md` is unchanged. The Executor log and friction record are written, `theseus validate` reports 0 errors, and everything is committed as `13a9672`.

**To unblock:** someone with `psql` rights needs to finish the first request, or the executor needs permission for `sudo -u postgres psql` and to read `/etc` and `/var/lib/dpkg`.

**Lessons for the Atlas:**
- Measurement packets should only be handed out once the server's health check responds.
- The one-line `apt-get install` in `environment.md` doesn't work on this machine. The real setup also needs the database user and database created, RabbitMQ installed, `DEBIAN_FRONTEND=noninteractive`, and a fix for the broken `update-notifier-common` setup.
- `theseus packet new` only accepts these types: characterize, investigate, refactor, migrate, rewrite, interop, port-upstream.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
