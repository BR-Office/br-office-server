You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0037, described in .theseus/queue/ (search for PKT-0037). The changes to review are `git diff 70173b0558a348cdf6643efa032347b12e68217d..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I wrote the diagnosis to `.theseus/diagnosis/DIAG-sdkjs-word.md` and committed it as `4932f9d`. The verdict is **refactor** (staying in JavaScript), with confidence low, and it only holds if a planned profiling packet confirms the time is in this module. All three acceptance commands pass; `theseus validate` reports 0 errors and 1 warning, which I did not look into.

**Why refactor:** this module is where users wait.
- **Opening:** after Editor.bin arrives, a docx takes 1.9–2.4 s to parse, lay out and render, and that grows with document size.
- **Co-editing:** the slow cases (p90 105–143 ms) come from the receiving browser applying the change, not the server.
- **Typing:** p90 is 119–156 ms on 10- and 100-page documents, above the ~50 ms point where people notice.

What's missing is a split between this module, the shared sdkjs code, fonts and the browser.

**Discarded:**
- **Keep:** it would leave the largest client cost untouched.
- **Migrate or rewrite:** no oracle is established yet (rule D1), the hotspot is unknown, and the model is tightly tied to sdkjs's shared globals. Moving it to Rust/WASM would mean copying data across the boundary on every edit.
- **Retire:** this is the live document editor.

**Packet plan (wave 0):**
- **P1:** profile opening, typing and applying remote changes on the PKT-0016 sample documents, split by part of the module. It needs the running Document Server and a browser. Its result decides the actual refactor packets, or downgrades the verdict to keep.
- **P2:** run the existing word test suites as the oracle and update the Atlas card.

**Surprise:** the Atlas card says there is no oracle, but `external/sdkjs/tests/word/` has 21 QUnit test suites that already run headless in upstream CI.

**Not done:**
- Permissions refused the commands I tried for line counts, so I used the card's figure of about 428k lines.
- I did not run the test suites; that is P2's job.
- I did not read any other diagnosis of this module, to keep it independent.

The Executor log and the friction line are written.

**Lessons for the Atlas:**
- Cards for external modules should check for test suites in the sibling repository before setting the oracle level.
- External modules have no `graph.json` or size metrics yet.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
