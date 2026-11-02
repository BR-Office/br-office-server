You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0064, described in .theseus/queue/ (search for PKT-0064). The changes to review are `git diff e3928f0291ad6192cf6043dd694e8074beb5cac0..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I fixed the editorStat bug from the packet, but I could not add most of the crash guards it asks for. The rules for this packet block them. Both acceptance commands pass: `.theseus/oracle/unit.sh` gives 183 passed and 1 skipped, and `npm run lint:check` exits 0 with one warning that was already there in AdminPanel. The work is committed as `8e5cf9e`.

**Why most guards weren't added:** the contract says existing tests stay unchanged, and the P2 test file (`tests/unit/docsCoServerCrashPaths.tests.js`) is not in `target.files`. That file records today's crashing behaviour on purpose: the TypeError log lines, the TypeError rejection, and a user id of `'undefined'`. Any real guard changes what it checks, so the test would fail. I did not add guards that still throw a TypeError just to keep those tests green.
- **Blocked:** a connection without handshake data, `unLockDocument` or `saveChanges` sent before login, `startForceSave(Form)` with no user, and a user without an id.
- **Partly done:** an auth message without a user or token used to be ignored silently. That test only checks that nothing happens, so I added a warning log and left the behaviour unchanged.

**What I changed in `DocService/sources/DocsCoServer.js`:**
- **editorStat fix:** line 155 built editorStat from the editor-data module (`new editorDataStorage()`) instead of the stats module. A new exported function, `createStorageInstance(module, className, ...args)`, now creates editorData, editorStat and editorStatProxy. It tries the module's named class first, then the module's own constructor, and otherwise throws a clear error.
- **editorStatProxy:** it is only created when `REDIS_SERVER_DB_KEYS_NUM` is set, and it had no fallback at all; it now goes through the same function.
- **Tests:** 5 new ones in `tests/unit/docsCoServerGuards.tests.js` cover that function and check which classes are created with the default config. The new warning log has no test, because that needs the full socket setup from the P2 tests.

**Follow-up request:** it is recorded and committed in `.theseus/spawn/PKT-0064-flip-the-pinned-…md`. It asks for real guards on the blocked paths, puts the P2 test file in its target, and limits the "unchanged" rule to the tests that aren't on P2's crash list.

The upstream fixes 81132 and 81576 are mostly in files outside this target (`static.js`, `aiProxyHandler.js`, `canvasservice.js`), so I didn't touch them. The Executor log and friction line are written. `theseus validate` reports no errors and one warning, which I didn't look into.

**Lessons for the Atlas:**
- A refactor that follows a test-only packet must list that test file in its target. If its contract also says "existing tests unchanged", it cannot change anything those tests pin.
- DocsCoServer now creates its storage objects through `createStorageInstance`.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
