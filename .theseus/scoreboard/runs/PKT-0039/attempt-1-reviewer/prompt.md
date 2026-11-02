You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0039, described in .theseus/queue/ (search for PKT-0039). The changes to review are `git diff 4e4f6371338f41d1a9979e71e1912106d94dea55..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've written and committed the diagnosis for the web-apps document editor (PKT-0039, commit `32b820b`). The verdict is **refactor**, with low confidence, and only if a first measurement shows the time is really in this module. All three acceptance commands pass; `theseus validate` reports 0 errors and 1 warning.

**Why refactor, and why only conditionally:** this module is the editor's page and startup code (it loads the UI and starts the editing engine). Opening a document takes 3.4–4.4 s, and about 1.5 s of that is loading scripts. Part of that window could belong to this module. Most of the open time, plus typing and applying other users' edits, happens in sdkjs (the editing engine), not here. Nobody has yet measured how the 1.5 s divides between sdkjs's bundle, this module's own bundle, translations and fonts. The module also has no tests that can confirm its behaviour (oracle `none`).

**Packet plan (wave 0):**
- **P1:** measure how the 1.5 s divides between those pieces, and how long the editor's components take to start up.
- **P2:** set up a test of the open sequence: the existing web-apps test pages if they run headless, plus a browser script that opens a document, types and saves.

Both declare `requires: [documentserver, browser]`. The actual refactors, such as loading parts of the editor only when needed, get planned after P1.

**Decisions:**
- **No language change.** This code is UI glue whose cost is loading and parsing, not computation.
- **Kept any change in the open order behind P2,** because lazy loading would touch rules the module card records: the engine must load first, and the document must not be loaded until permissions are checked.
- **What would change the verdict:** if P1 finds less than 200 ms (or under 10% of the open) in this module, it becomes **keep**. If the time turns out to be in the shared UI code `apps/common`, that code needs its own module card.

**Surprise:** `main/app.js` loads about 30 of the editor's components (controllers) at startup, before the document starts loading. Loading them later is a plausible way to speed up opening, but it is unproven.

**Not done:** I ran no measurements and didn't execute the web-apps tests. I didn't read any other diagnosis of this module.

**Lessons for the Atlas:**
- The module card should record the split of the 1.5 s script window once P1 has measured it.
- `apps/common` has no card, but it may hold part of the cost.
- My permissions refused `sed` for reading part of a file, so I had to read whole files. I recorded this as friction.

The executor log and the friction line are both written.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
