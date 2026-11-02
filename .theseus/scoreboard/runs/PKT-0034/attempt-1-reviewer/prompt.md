You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0034, described in .theseus/queue/ (search for PKT-0034). The changes to review are `git diff 63dc6907734fcae8ee3ca9bb8dd17203ee6a6735..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I wrote the first three submodule cards for `sdkjs-word`: model-core, paragraph and serialize. All three are linked from the index card and from `INDEX.md`. The acceptance check passes, `theseus validate` reports 0 errors, and the work is in two commits on the packet branch. The sdkjs QUnit tests were not run because I didn't build sdkjs.

**Cards written:**
- **`sdkjs-word-model-core.md`** covers only `Document.js` (about 29k lines). The group the index card proposed for model-core is about 48k lines, well over the 20k limit. The packet allows a card to cover a single file.
- **`sdkjs-word-paragraph.md`** covers `Paragraph.js` and `Paragraph_Recalculate.js` (about 26k lines). That is slightly over the limit, but I kept them together because recalculation is one concern split across two files. The proposed group was about 79k lines.
- **`sdkjs-word-serialize.md`** covers `Serialize2.js` (about 17.8k lines), which fits as is.

**Decisions:**
- **Two new rows in the index card:** `word/content` (`DocumentContent*.js`, controllers, `History.js`, `SelectedContent.js`, about 19k lines) and `word/run` (`Run.js`, `ParagraphContent*.js`, `Editor/Paragraph/`, about 53k lines, needs a further split). These hold what I cut out of the two oversized groups.
- **Flat card ids:** the ids are `sdkjs-word-model-core` rather than `sdkjs-word/model-core`. `theseus validate` requires the file path to match the id, and the acceptance command expects a flat file name. The `parent: sdkjs-word` field keeps the hierarchy. This conflicts with the spec's `core/zip`-style examples, which I noted in the friction line.
- **No follow-up packet filed:** the index card already lists the remaining submodules as needing their own packets.
- **Claims and oracle:** every claim is tagged `[model]`, and the line numbers were checked with grep at the base commit. The oracle level is "partial", based on the QUnit suites in `external/sdkjs/tests/word/`.

**Lessons for the Atlas:**
- **Layout finishes after open:** recalculation runs in slices on a 10 ms timer (`ContinueRecalculationLoopTimer`). "Document open" and "all pages laid out" are different moments, so open-time measurements must say which one they use.
- **Size groups before proposing them:** two of the three proposed groups were over the limit, so check sizes with `wc` first.
- **Submodule ids:** submodule cards need flat ids of the form `<parent>-<sub>`.

**Permissions:** a few compound shell commands were blocked by permission prompts, including the script I had written to update the index card, `INDEX.md` and the log. I didn't work around them; I made the same edits with the file editor instead. Because of this, the first commit contains only the three new cards and the second contains the links, the Executor log and the friction line.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
