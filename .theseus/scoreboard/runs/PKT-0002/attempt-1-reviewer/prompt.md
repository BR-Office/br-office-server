You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0002, described in .theseus/queue/ (search for PKT-0002). The changes to review are `git diff 289f71c2a9ce285b98779b6d65e6572240b5db93..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I wrote the Atlas card for the docservice module at `.theseus/atlas/docservice.md` and committed it in `609f874`. The acceptance command `test -s .theseus/atlas/docservice.md` passes. The whole file is 757 words, so the body is under the 800-word limit. The goal also asked me to add the module's row to `INDEX.md`, and I did not do that (see below).

**What's in the card:** It is based on commit `289f71c`. It has all the sections the spec requires: responsibility, entry points (each HTTP route, socket message and command mapped to its file), the main flow in 7 steps, invariants, pitfalls, oracle, open questions and lessons. Every interpretive claim is tagged `[model]`.

**Decisions:**
- **Tool-filled fields are empty.** There is no `graph.json` and no metrics output yet, so the languages, size, dependencies, metrics and freshness fields are `null`. I left them empty rather than fill them from my own reading, as rule A1 requires.
- **One card, no split.** `wc -l` gives about 14.7k lines in `DocService/sources`, below the 20k threshold. `DocsCoServer.js` alone is about 4.7k lines. Whether to split the module is listed as an open question.
- **`INDEX.md` not changed.** It already exists and `target.files` is empty, so editing it would break the target rule. The spec also says the index is generated from the cards. The packet template should fix this conflict between the goal and the target.
- **No line added to `friction.jsonl`.** That file is also outside the target. I recorded the friction in the Executor log instead, which is filled in and committed with the card.
- **No follow-up packets spawned.** The open questions in the card are candidates for `investigate` packets.

**Lessons for the Atlas:**
- `DocsCoServer.js:155` falls back to `new editorDataStorage()` when building `editorStat`. This looks like a copy-paste slip.
- Which editor-data storage is used is picked at runtime from config. The Redis version is not in this module.
- The unit test run (`.theseus/oracle/unit.sh`) runs `ts-strip.js` first. Only `utilsDocService.tests.js` tests this module directly. Co-editing, conversion and WOPI have no unit tests.
- The tool-filled fields will stay empty until a tool produces `graph.json` and the metrics.

Some of my combined shell commands, including any with `cd`, were refused by the permission checks. I ran the parts separately instead, and nothing I needed was blocked.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
