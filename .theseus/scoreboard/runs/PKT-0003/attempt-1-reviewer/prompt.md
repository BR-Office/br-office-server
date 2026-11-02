You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0003, described in .theseus/queue/ (search for PKT-0003). The changes to review are `git diff 23392b575576b4e7b1580e51b817094a8b2aa365..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I wrote the Atlas card for the `docservice` module at `.theseus/atlas/docservice.md`, added its row to `INDEX.md` and filled in the packet's Executor log. The acceptance command passes and everything is committed as `e0aac8a`.

**What the card covers:** all the standard sections, with every interpretive claim tagged `[model]`. The entry points come from the routes registered in `server.js` and from what each file exports. The main flow traces a document from open, through conversion via RabbitMQ and co-editing, to save and callback, plus periodic cleanup. The card is based on commit `23392b5`.

**Decisions:**
- **Tool fields are empty.** `.theseus/atlas/graph.json` doesn't exist and the adapter has no metrics scripts. So the fields that must come from tools (languages, size, dependencies, metrics) are `null`, and the INDEX row shows the line count as "n/a" and the hotspot as "unknown".
- **One card, not split.** The source files total about 14,700 lines by `wc`, under the 20,000-line split threshold. `DocsCoServer.js` alone is about 4,700 lines, so I flagged it as a candidate for its own card.

**Problems in the code, recorded as Pitfalls:**
- `package.json` lists `sources/editorDataRedis.js` among the files to bundle, but that file doesn't exist.
- `DocsCoServer.js:155`: when the stats storage module has no `EditorStat`, the fallback builds `editorStat` from the editor-data module instead. It looks like a copy-paste bug.
- The four SQL dialects share `baseConnector.js`, so a change there has to work in all of them.

**Not done:**
- **No friction line.** I didn't append to `.theseus/scoreboard/friction.jsonl`: it's outside the target, and a fourth changed file would break the packet's 3-file budget.
- **No follow-up packets requested.** The card's Open questions (who produces `graph.json`, the missing file, the line-155 fallback, splitting `DocsCoServer.js`) are candidates for follow-up investigate packets.

**Lessons for the Atlas:**
- Run the graph and metrics tools before the cartography packets. Otherwise every card ships with empty tool fields.
- No tests were found for `DocsCoServer.js`, `canvasservice.js`, `converterservice.js` or `wopiClient.js`. That's the biggest gap in the oracle for this module.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
