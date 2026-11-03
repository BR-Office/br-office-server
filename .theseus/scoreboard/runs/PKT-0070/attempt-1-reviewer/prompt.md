You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0070, described in .theseus/queue/ (search for PKT-0070). The changes to review are `git diff 3bd55843ebf895864fd9faac50729e78a2d63658..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've added the guards for all five pinned crash paths and flipped the six tagged expectations to match. Both acceptance commands pass: `.theseus/oracle/unit.sh` gives 178 passed and 1 skipped, and `npm run lint:check` exits 0. Commit `862c11b` is on `pkt/PKT-0070`.

One unit run failed 2 timing tests in `tests/unit/request.tests.js` (300 ms axios timeouts), which has nothing to do with this change. The next two runs passed fully. I recorded it as flaky in the friction line.

**What each guard does (in `DocService/sources/DocsCoServer.js`)**
- **Connection without handshake:** checked before the handshake URL is read. The server logs "connection without handshake data", sends the drop reason and disconnects. The client sees the same result as before, but there's no TypeError now.
- **`unLockDocument` / `saveChanges` before auth:** ignored, with a warning log. No reply is sent, so nothing new reaches sdkjs and the protocol stays the same.
- **`startForceSave` with a connection that has no user:** returns early with `UnknownError`, the same reply `forceSaveStart` already gives before auth. Guarding only the user lookup just moved the crash into `converterservice.js`, which is outside the target. That's why the guard sits at the top of `startForceSave`.
- **User without id:** the server now generates `uid-<timestamp>-<8 hex>` instead of storing the string "undefined". The installed web-apps already uses `"uid-" + Date.now()` when no user is given, and the random suffix stops two users without ids being merged. I didn't reject these logins, because that would break integrators who leave the id out.
- **Auth without token or user:** the connection is now refused with access denied and disconnected, instead of being left open and unauthenticated. The untagged "auth without data.token" test still passes unchanged.

The "auth ignored" warning that PKT-0064 added isn't on this branch, because PKT-0064 was blocked and never merged. The handling for a missing token or user is therefore written from scratch here.

No follow-up packets were needed. The friction line and the Executor log are in place, and `theseus validate` reports 0 errors.

**Lessons for the Atlas**
- In docservice, a guard placed on a deep property read can just move the crash further down. Guard at the entry point, then re-run the characterization tests to confirm.
- The server now generates `uid-…` ids the way web-apps does when a login has no user id.
- `unit.sh` always runs the whole suite even when given a file filter, so checking a single test file means calling jest directly.
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
