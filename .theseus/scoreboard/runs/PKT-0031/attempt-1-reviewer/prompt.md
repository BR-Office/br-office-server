You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0031, described in .theseus/queue/ (search for PKT-0031). The changes to review are `git diff 76633f92a84cd985ff17fc0b79c111188ce431cd..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0031 is finished and committed as `13a8504`. The acceptance check `test -s .theseus/atlas/sdkjs-word.md` passes, and `theseus validate` reports 0 errors and 1 warning, which I didn't look into.

**What I did**
- **Wrote an index card, not a module card.** `external/sdkjs/word` is about 428k lines of JS, counted with `wc` rather than a tool. That is far over the 20k limit, so under spec §3 `.theseus/atlas/sdkjs-word.md` is an index card. It covers the module's responsibility, 11 proposed submodules (api, model-core, paragraph, table, layout, styles-numbering, features, serialize, collab, drawing, math), and how they relate.
- **Traced the two paths with known timings:**
  - Opening a document: `asc_docs_api.OpenDocumentFromBin` → `BinaryFileReader` in `Serialize2.js` → `CDocument.Recalculate` / `Recalculate_Page` → canvas drawing.
  - Applying remote changes: `CWordCollaborativeEditing` → `Continue_FastCollaborativeEditing`.

  The card gives line references for both.
- **Added the module's row to `INDEX.md`.**
- **Spawned a follow-up request** (`.theseus/spawn/PKT-0031-split-sdkjs-word-into-submodule-cards.md`) for the first submodule cards: model-core, paragraph and serialize, which carry document open and recalculation. Single files may need their own cards: `Document.js` alone is 29k lines.
- **Filled in the Executor log and appended the friction line.**

**Decisions**
- All tool fields in the header are left null because there is still no `graph.json`. The sizes in the card body are marked as coming from `wc`.
- The submodule boundaries are guessed from file names, not from a call graph, so every one is tagged `[model]` and listed under Open questions.

**What I couldn't do**
- I did not look for a test suite to use as an oracle. Any sdkjs tests would sit outside this module's path, so the card says the oracle is unknown.
- My permissions refused `find -exec`, shell loops and a Python edit. I didn't work around them: I took the line counts from shell globs and wrote the spawn file with the Write tool.

**Lessons for the Atlas**
- The planner should check module size before issuing a single-card packet. This one could have started as an index card plus split packets.
- Without `graph.json`, every card so far has null tool fields.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
