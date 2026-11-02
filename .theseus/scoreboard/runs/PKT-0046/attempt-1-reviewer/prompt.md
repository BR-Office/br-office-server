You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0046, described in .theseus/queue/ (search for PKT-0046). The changes to review are `git diff 30b0aa9d5025cf4949f1caefcec3335136a6d2c5..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0046 is finished and committed. The new sdkjs common oracle passes 4 of 4 suites (300 of 300 assertions). It only checks the Builder API, so most of the common module still has no test behind it. Both acceptance commands pass: `unit.sh` gave 178 passed and 1 skipped, and `lint:check` gave 0 errors and 1 warning that was already there.

**What I added**
- **`.theseus/oracle/sdkjs-common.sh` and `sdkjs-common-run.cjs`**: these run the `external/sdkjs/tests/common` QUnit suites headless. I copied them from the PKT-0044 word oracle. The script runs the `common/` suites listed in upstream `tests/runAll.js`, plus every other page under `tests/common`.
- **Run time**: about 11 to 20 seconds. The first run in a fresh worktree adds about 2 minutes of setup (`npm ci` and `npm run develop`).
- **Atlas card `sdkjs-common`**: oracle level is now `unit` and its source is the new script. The card has a table of results and lists what the suites don't test: font loading, co-editing send/apply, history/undo, DrawingML serialization, charts/SmartArt and clipboard. Refactors in those areas need their own checks.

**Results and decisions**
- **Passing**: the four upstream api suites (word, cell, slide, visio), 75 of 75 assertions each.
- **Skipped, compiled variants**: the four `*-compiled.html` pages need a full `npm run build`, which the oracle doesn't do.
- **Skipped, broken**: two suites that upstream `runAll.js` doesn't list.
  - `color-mods` fails 11 tests (9766 of 10023 assertions).
  - `chartEx-serialize` doesn't finish within 120 seconds.

  I left them out so the oracle stays green. `ORACLE_ALL=1` still runs them. I filed a follow-up request in `.theseus/spawn/` to find out why they fail; it is an `investigate` packet and needs the browser.

**Not done:** I didn't try a longer timeout for `chartEx-serialize`, and didn't run the `libfont/test/` pages or the compiled variants.

**Lessons for the Atlas**
- Upstream `runAll.js` lists the suites known to pass. Other suites in the tree may be broken, so don't use them as checks until they've been looked at.
- The runner code is now duplicated between word and common, because the word runner was outside this packet's target. I recorded that in the friction line; a shared runner that takes the editor as a parameter would fix it.

The commit touched 6 files, which is exactly the packet's file budget.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
