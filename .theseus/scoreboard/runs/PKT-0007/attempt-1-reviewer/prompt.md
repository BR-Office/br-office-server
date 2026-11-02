You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0007, described in .theseus/queue/ (search for PKT-0007). The changes to review are `git diff 3b8dda00eb88ef2c6bf0d498642cdcddd27574ba..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've added 16 characterization tests for PKT-0007 in the new file `tests/unit/operationContext.tests.js`, and committed them as `b27bbac`. Both acceptance commands pass:
- **`.theseus/oracle/unit.sh`:** 10 suites, 133 tests passed, 1 skipped.
- **`npm run lint:check`:** no errors. One warning in `AdminPanel`, which was already there.

`theseus validate` reports 0 errors and 1 warning, which I didn't look into.

**What the tests pin:**
- **Wire format:** `toJSON()` returns exactly six fields, in a fixed order: tenant, docId, userId, userSessionId, shardKey, wopiSrc. It never includes config, secret or license.
- **Round trips:** a context sent through `TaskQueueData` JSON and rebuilt with `initFromTaskQueueData` comes back unchanged. The same holds for `initFromPubSub`.
- **`initFromRequest`:** the tenant comes from tenantManager, and shardkey, WOPISrc and usid come from the query string. docId and userId are kept.
- **`getCfg`:** tenant config overrides runtime config, which overrides base config. Also covered: the default value, persistentStorage taking its settings from storage, and the per-tenant cache being cleared.

**Decisions:**
- I faked the three config sources by mocking the functions `operationContext` calls (`jest.spyOn`), rather than writing config files. Each test resets the mocks and clears the shared config cache.
- I didn't cover `initFromConnection` or `initFromConnectionRequest`, because they're outside the packet's Goal.

**Surprises, pinned as they are rather than fixed:**
- `Context.init` doesn't clear `userSessionId` when given an empty one, so a reused Context keeps the previous session id.
- `initFromRequest` wipes shardKey and wopiSrc when the query doesn't include them.

**Lessons for the Atlas:**
- The line in the common module's Atlas card saying "No unit tests seen for operationContext" is now out of date.
- In unit tests, the config sources can be isolated by mocking the module functions, but the per-tenant config cache must be cleared between tests.

The packet's Executor log and "Lessons for the Atlas" section are filled in. I also added a line to `.theseus/scoreboard/friction.jsonl`; that file isn't in `target.files`, but `AGENTS.md` requires it. No follow-up packets were needed, and no command was refused.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
