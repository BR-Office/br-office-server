You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0004, described in .theseus/queue/ (search for PKT-0004). The changes to review are `git diff 20066c55da8518057546db093a963b8cdc95e178..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
My verdict for the `common` module is **refactor**: stay in JavaScript, write tests for the untested parts first, then make small structural fixes. The verdict is in `.theseus/diagnosis/DIAG-common.md`, the acceptance check passes, and the work is committed as `821f3bd`.

**Why refactor:**
- **Security and coupling:** Common is used by DocService, FileConverter, AdminPanel and SpellChecker. 27 files in DocService and FileConverter alone require it. It also handles the server's most sensitive logic: download filtering against SSRF, JWT helpers, tenant resolution from the Host header, and keeping each tenant's storage keys separate.
- **Maintenance:** `utils.js` is 1,563 lines of mixed concerns, `commondefines.js` is 1,245 lines, and `utils`, `operationContext` and `tenantManager` require each other in a cycle.
- **Thin tests:** `tenantManager`, `operationContext`, storage and the task queues have no unit tests.

**Why not migrate to TypeScript yet:** the untested parts are exactly what a migration would touch, and the many consumers plus the require cycle would make a mixed JS/TS build costly. Adding `// @ts-check` with JSDoc types gets most of the type-safety benefit without changing the build. I recorded what would change this: if the new tests raise the oracle to `good` and type checking finds real bugs, the module should be reassessed as migrate. That would need a second, independent diagnosis from another model.

**Packet plan** (the machine-readable block is in the verdict file):

| Key | Wave | Type | Work |
|---|---|---|---|
| P1 | 0 | characterize | Tests for `tenantManager` |
| P2 | 0 | characterize | Tests for `operationContext` |
| P3 | 0 | characterize | Tests for `storage-base` using the file-system backend |
| P4 | 1 | refactor | `@ts-check` and JSDoc types on `commondefines` and `operationContext` |
| P5 | 1 | refactor | Break the `utils` ↔ `operationContext` require cycle |

**Not done:** I didn't add the `friction.jsonl` entry that AGENTS.md asks for. That file is outside this packet's `create_in`, so it needs to be written outside this packet. The Executor log in the packet is filled in.

**Lessons for the Atlas:**
- The git history was restarted, so only one commit touches Common and churn tells us nothing. The verdict leans on code size and coupling instead.
- There is no `graph.json`, so I estimated coupling with grep. The card's dependency fields stay empty until the graph tool runs.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
