You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0027, described in .theseus/queue/ (search for PKT-0027). The changes to review are `git diff 1c371af49640a0ecedcd5e134ebbb17829972d8c..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0027 is done and committed (`c08df45`). Both acceptance commands pass: `.theseus/oracle/unit.sh` gives 150 passed and 1 skipped, and `npm run lint:check` gives 0 errors and 1 warning that was already there in AdminPanel. `theseus validate` reports no errors.

**What I did:** the test file from earlier attempts was not in the worktree because it was never committed, so I wrote `tests/unit/converterService.tests.js` again. It has 17 tests that run `convertJson` and `convertXml` with the task-result store, the queue (`DocsCoServer`), `canvasservice`, `wopiClient` and storage mocked. They pin down:
- **Async mode:** `async=true` and the string `"true"` answer at once with `end=false`. The task is queued, and the status is never polled and there is no wait.
- **Shard key:** if `DEFAULT_SHARD_KEY` is set and the request has no `shardkey` query parameter, the request is forced to sync.
- **Sync polling:** the loop waits 1000 ms per poll until the task is `Ok`, then returns the signed `output.pdf` URL. With a 3000 ms timeout, it returns `CONVERT_TIMEOUT` after exactly 4 waits, because the comparison is a strict `>`.
- **Error statuses:**
  - `Err` returns the row's `status_info`. `ErrToReload` returns it too and also runs a cleanup.
  - `NeedParams` or a missing row gives `UNKNOWN`.
  - A row whose `last_open_date` is older than the timeout gives `CONVERT_TIMEOUT`, even when its status is `Ok`.
- **Existing tasks:** a finished (`Ok`) task is not queued again. A task with status `None` is queued again.
- **Request errors:**
  - A bad `outputtype` gives `CONVERT_PARAMS` before anything is written.
  - An auth failure code is passed straight back.
  - An exception gives `UNKNOWN`.
- **XML:** `convertXml` follows the same flow with `isJson=false`.

**Decisions:**
- `utils` and the operation context are stubbed with `jest.spyOn`, not `jest.mock`, because the two modules require each other.
- The `addTask` mock returns an empty iterator, because the code calls it with `yield*`.
- No fake timers are used: `sleep` resolves at once and the timeout is set to 3000 ms.

**Lessons for the Atlas** (also written in the packet):
- A sync conversion checks the task status once per second, so sync response times come in whole seconds.
- `CONVERT_TIMEOUT` has two triggers: the wait time going over the timeout, and an old `last_open_date`.
- Earlier attempts lost their work because it was never committed before the packet was blocked. Committing early would have prevented that, and I added this to the friction log.

No permissions were refused this run, and I did not request any follow-up packets.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
