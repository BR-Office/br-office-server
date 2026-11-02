You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0048, described in .theseus/queue/ (search for PKT-0048). The changes to review are `git diff 5709d4bbc3ca359e647416fab76085c6641384da..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0048 is finished and committed as `db6c634`. The documenteditor now has a headless check that opens a document, types into it and confirms the save. Both acceptance commands pass: `unit.sh` gave 178 passed and 1 skipped, and `npm run lint:check` exited 0 with one warning.

**What I added**
- `.theseus/oracle/documenteditor-open.sh` and `documenteditor-open-run.cjs`: a Playwright script that runs against the Document Server already running on this machine. It creates a new docx through the example app, waits for the toolbar and for the loading overlay to go away, types a unique marker, and closes the editor. It then waits for the save callback (status 2) and checks that the marker is in the saved file.
- **Results:** it passed 3 out of 3 runs, about 11.3 s each. The toolbar appeared at about 1.2 s, the document finished loading at 1.2–2.9 s, and the save landed at about 11.2 s. Most of that time is the server's delay between closing the editor and sending the callback. Pointed at an address with nothing on it, the script reports FAIL and exits 1.
- **Atlas card:** I set the oracle level from `none` to `partial`, listed the script as its source, rewrote the "Available oracle" section and added a "Limits" paragraph.

**Decisions**
- **How the save is detected:** I watch for the example app rewriting the stored file, then check that the marker is inside it. The alternative was running my own callback server, which would have meant setting up JWT.
- **`partial`, not `good`:** the check only proves that open, edit and save still work. It does not check the open-order rules (sdk first, `asc_LoadDocument` after `onEditorPermissions`), plugins or dialogs.
- **The upstream test page was not adopted:** `external/web-apps/test/documenteditor/main` is a manual viewer page with no assertions, and it needs the development sdkjs scripts. So it is not a test suite.

**Limits and surprises**
- The new check is not one of the acceptance commands, because it needs the server running. The factory therefore does not run it.
- It tests the build installed under `/var/www`, not the `external/web-apps` checkout. A refactor has to be built and deployed before this check says anything about it.
- Each run leaves a `new (N).docx` file in the example app's storage.
- The lint configuration ignores `.theseus/`, so `lint:check` never looks at the new runner script.
- Clicking the main page canvas `#id_viewer` fails because other layers sit on top of it. The click has to go to `#id_viewer_overlay`, after the loading overlay is gone.

I created no spawn requests and moved no packets. The Executor log, the Lessons section and the friction line are written, and `theseus validate` reports 13 ok, 1 warning and 0 errors.

**Lessons for the Atlas:** the open/edit/save path can be checked headless in about 11 s with this script, but only against the deployed build. Plan refactor packets so they build and deploy before running it.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
