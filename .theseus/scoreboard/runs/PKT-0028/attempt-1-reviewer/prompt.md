You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0028, described in .theseus/queue/ (search for PKT-0028). The changes to review are `git diff 3d28cb47dc7ed6d5c706fae858f9221ed93fc1f1..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I added a characterization test suite for PKT-0028 and committed it as `befd220`. Both acceptance commands pass: `.theseus/oracle/unit.sh` (12 suites, 178 passed, 1 skipped) and `npm run lint:check` (0 errors; one warning in `AdminPanel` that was already there). `theseus validate` reports 0 errors. No source file changed.

**What I did:** created `tests/unit/docsCoServerCrashPaths.tests.js` with 27 tests. Every socket handler lives inside `install()`, so the suite calls `install()` once against a fake socket.io server and drives fake connections. It uses the real `editorDataMemory` store and mocks the message queues, database, storage and `canvasservice`, so it needs no network or services.

**Crash-prone behaviour now pinned** (each tagged `// crash-prone: P4 target`, so P4 sees which expectations flip when it adds guards):
1. A connection with no handshake data throws a TypeError. It is caught, and the client gets a "drop" reason and is disconnected.
2. An `auth` message missing `user` or `token` is silently ignored: no reply, no disconnect, and the connection stays open without being authenticated.
3. A user with no `id` is stored with the id `"undefined"`.
4. `unLockDocument` and `saveChanges` sent before auth throw a TypeError on `conn.user.id`. It is caught and logged.
5. Forcesave after close: `startForceSave` (Form type) with a connection that has no user rejects with a TypeError from `getExternalChangeInfo`.

**Pinned as already safe:**
- **Missing data:** no name gives "Anonymous"; missing permissions gives an editor.
- **Before auth:** `forceSaveStart` replies `UnknownError`.
- **Client disconnect during auth or save:** the work stops cleanly once the connection is closed.
- **Last editor leaves with changes:** a disconnect waits 5 s before saving; an explicit `close` saves at once, and the later disconnect does nothing.
- **Forcesave after `close`:** replies `NotModified`.
- **File streaming:** `utils.pipeHttpStreams` ignores a client abort and rethrows storage errors.

**Decisions:**
- I recorded current behaviour even where it is wrong, and fixed nothing.
- I did not request a follow-up packet, because P4 already exists in the plan and depends on this one.
- `wopiClient.js:1212` streams without that protection and is not tested here.
- The upstream fix for crashes on client disconnect during file streaming (bug 81132) is still not ported. Whether to port it is already listed as a human decision in `baseline.md`.

**Refused by permissions:** `npx prettier --check` on the new file, and running a script from the scratchpad. I didn't work around either, so the new file's Prettier formatting is unchecked.

The Executor log, Lessons for the Atlas and the friction line are filled in.

**Lessons for the Atlas:**
- **Testing DocsCoServer without services:** mock the socket.io `Server`, make the queue fakes call their init callback, and make `baseConnector.getTableColumns` reject so the database check stops startup. Set the license with `setLicenseInfo` first, as `server.js` does; without it every auth fails. The new file can serve as a template.
- **Dominant crash shape:** code that reads `conn.user` without checking it exists.
- **Oracle gotcha:** `.theseus/oracle/unit.sh <name>` adds the argument to the ignore list, so it *excludes* that suite. Use `--testPathPattern=<name>` to run one suite.
- **Log capture:** the logger grabs `console.log` when it loads, so tests that check log output must spy on the log4js `Logger` prototype instead.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
