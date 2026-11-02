You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0033, described in .theseus/queue/ (search for PKT-0033). The changes to review are `git diff 7ec34c710bf9112dee9ebcfae990f6a5e1dcb679..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I wrote the Atlas card for PKT-0033 and committed it as `721381e`. The acceptance command passes, and `theseus validate` reports 0 errors and 1 warning, which I didn't look into.

**What I did**
- **New card** `.theseus/atlas/web-apps-documenteditor.md`. The module has about 90,000 lines of code, far over the 20,000-line limit, so I wrote it as an index card that proposes splitting it into six parts. The 90,000 figure is my own `wc` count, leaving out the `locale/` and `resources/` folders; it is not a tool figure.
  - **Proposed parts:** the main page and boot scripts, the main controllers, the main views, `forms`, `embed` and `mobile`.
  - **What it maps:** where the app starts, the open sequence (the editor API is created in `Viewport.onLaunch`; `Main.js` takes the config, checks permissions and loads the document), the rules that must hold, pitfalls, and open questions.
- **Index:** added one row to `.theseus/atlas/INDEX.md`.
- **Executor log** in the packet and my **friction line** in `friction.jsonl` are both filled in.

**Decisions**
- I left the tool-filled header fields empty because `graph.json` still doesn't exist; numbers in the body are labelled as hand counts.
- Every claim is tagged `[model]`, except the packet's "about 1.5 s and ~500 KB per open", which is tagged `[human]`.
- I didn't create any follow-up packets. The split table in the card can serve as the plan for them.

**What I could not do**
- I didn't open or run the tests in `external/web-apps/test/`, so the card says there is no known way to check changes.
- I didn't measure where the 1.5 s and 500 KB go. Both are listed under Open questions.

**Budget:** the commit touches 4 files, and the packet allows 3. The extra two are the packet file and `friction.jsonl`, which the run rules require me to edit.

**Lessons for the Atlas**
- The help folders (`resources/help/*`) include copies of a third-party search script that inflate line counts.
- `mobile/` is a separate React app that shares no controllers with `main/`.
- The development page (`index.html`) and the built page (`index.html.deploy`) load scripts in completely different ways, so any open-time measurement must say which one it used.
- Much of the boot logic lives in `apps/common`, which has no card yet.
- **Process:** shell loops and variables kept needing approval, and one `cd` stayed in effect and broke later relative paths.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
