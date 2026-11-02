You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0038, described in .theseus/queue/ (search for PKT-0038). The changes to review are `git diff 2ea2df5f4492fe0d5bb29cfa10003f9669a3d82c..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've written the sdkjs-common diagnosis to `.theseus/diagnosis/DIAG-sdkjs-common.md`. The verdict is **refactor, conditional on profiling**, with low confidence. All three acceptance commands pass (`theseus validate`: 0 errors, plus the usual pilot-mode warning), and the work is committed as `b40a171`.

**Why this verdict:**
- **Where the time is:** the baseline puts most of the open time (1.5–2.4 s after Editor.bin) and the co-edit apply tail in the browser client. This module owns several pieces of that path: font loading, the shared drawings and charts code and its serialization, and the co-editing and undo history. But no measurement yet splits this module's share from the editor-specific code, hence "conditional".
- **No language change:** there are no working tests to prove equivalence yet (rule D1), and every editor reaches into this module's global objects. A language boundary would cut through the most-used code in the client.

**Main finding:** fonts load one at a time. The loader in `external/sdkjs/common/GlobalLoaders.js:184-263` takes the first font in the list and, if it isn't ready, checks again every 50 ms before moving to the next. Each open fetches 14–25 font files, so this waiting could add a noticeable share of the open time. It is the most likely first refactor, but it hasn't been measured yet.

**Packet plan (wave 0):**
- **P1:** profile open and remote apply in the word and cell editors, split the time across this module's parts, and record when each font file is requested and arrives. It needs the running Document Server and a browser (`requires: [documentserver, browser]`).
- **P2:** run the existing tests in `external/sdkjs/tests/common` (api, charts, color-mods) so they can serve as the oracle. The Atlas card says there is no oracle (`none`) without having checked these.

**What would change it:** downgrade to keep if P1 finds this module is under 15 % of the time, and drop the font refactor if fonts already load in parallel.

**Not done:** I didn't run any profiling or tests (outside this packet's scope). The line counts come from the Atlas card, not from tool data. I didn't read any other diagnosis of this module; I read the sdkjs-word one only for its format. The packet log and the friction line are filled in.

**Lessons for the Atlas:**
- The sdkjs cards should record the existing test suites rather than saying "no oracle" without checking.
- The serial font loading belongs in the sdkjs-common card's Hotspots section.
- The factory's permissions refused read-only commands chained together (`ls; head; git -C`), so I had to run them one at a time.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
