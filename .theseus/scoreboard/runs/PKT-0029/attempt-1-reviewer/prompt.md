You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0029, described in .theseus/queue/ (search for PKT-0029). The changes to review are `git diff 258b862a2bf65c493a3f9c1d9bdf26f1123ff823..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've finished PKT-0029 and committed it as `1776f81`. This time I had network access, so I found both upstream ONLYOFFICE commits and checked them against Euro-Office `main`. The packet declares no acceptance commands, so there were none to run; `theseus validate` reports 0 errors and 1 warning.

**Bug 81132 (client disconnect while a file is streaming crashes the process)**
- **Upstream commit:** `12ba395e`, on ONLYOFFICE's `release/v9.4.0` only.
- **What it changes:**
  - In `routes/static.js` and `ai/aiProxyHandler.js`, a client disconnect is now logged at debug level instead of as an error.
  - An error status is only sent if response headers haven't gone out yet; sending one afterwards was the crash.
- **Fit with our `main`:** the actual fix applies cleanly. The only part that doesn't is a comment wording change in `aiProxyHandler.js`, which can simply be left out.
- **Recommendation:** port it. Risk is low because it only touches error handling.

**Bug 81576 (a failed final save leaves the document stuck in "saving", so shutdown hangs)**
- **Upstream commit:** `8585bcf4`, on ONLYOFFICE `master` only and not yet in any release.
- **What it changes:**
  - After a final save that fails for good, the document is reset to normal with a "file not assembled" marker instead of staying stuck. Unsaved edits are kept so they can be replayed.
  - A callback acknowledgement no longer counts as a successful save.
  - When an editor opens such a document, it shows a "file not assembled" warning.
  - It adds a new file, `documentRecovery.js`.
- **Fit with our `main`:** applies except for the list of imports at the top of `canvasservice.js`, a trivial manual fix. Everything the logic needs already exists in our code.
- **Recommendation:** medium risk, because it changes how a failed save is recorded. Port it only with tests that a failed save no longer blocks shutdown, that reopening shows the warning and replays the edits, and that the corrupted-file path is unchanged. The alternative is to wait until it reaches an upstream release.

**What you need to decide:** whether to port 81132 now, and whether to port 81576 now with tests or wait for upstream.

**Files:** the assessment is in `.theseus/diagnosis/PKT-0029-upstream-fixes-81132-81576.md`, with both upstream patches saved beside it.

**Decisions and surprises**
- I didn't port anything: this is an investigate packet with no target files.
- I didn't spawn port packets either; that should wait for your decision.
- The diagnosis file that the first attempt's log said it had written was never committed, so I wrote it from scratch.
- The first attempt's guess about `static.js` was right, but `aiProxyHandler.js` turned out to be affected too.
- The follow-up packet PKT-0050 (fetch the upstream diffs with network access) is now redundant and can be closed.

**Lesson for the Atlas** (recorded in the packet): upstream fixes can be found with `git log --all --grep=<bug#>` on a lightweight clone of ONLYOFFICE/server. `git apply --check -C1 -v` then shows quickly whether a patch fits our code.

My executor log and friction line are recorded. No commands were refused by permissions this time.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
