You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0032, described in .theseus/queue/ (search for PKT-0032). The changes to review are `git diff ddf327a176afef27551582d9f28192975572e069..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I added the Atlas card `.theseus/atlas/sdkjs-common.md` and its row in `INDEX.md`, and committed both as `b398de4`. The acceptance command `test -s .theseus/atlas/sdkjs-common.md` passes, and `theseus validate` reports 0 errors (1 warning about pilot mode, which was already there).

**Decisions:**
- **Index card, not a module card.** `common` is about 395k lines of `.js`, far over the 20,000-line limit. That count comes from my own `wc` over three directory levels, not from a tool, and the card says so. Following the `sdkjs-word` precedent (spec §3), the card proposes 10 submodules: api, coauth, fonts, drawings, charts, smartart, serialize, text-io, extensions and platform. It also describes the open and co-editing paths and lists the largest files.
- **Header data left empty.** Size, languages, dependencies and metrics are `null` because there is still no `graph.json`.
- **No follow-up packets yet.** Packets to split the module should wait until `graph.json` exists or the reviewer agrees with the split. The executor log says this.

**Surprises:**
- `docscoapi.js` contains two co-editing client classes, `CDocsCoApi` and `DocsCoApi`. Why there are two is listed as an open question.
- `external/sdkjs/tests/` (`common/`, `runAll.js`) could serve as a test oracle, but I didn't run it, so whether it runs headless is unknown.
- `find | xargs` and nested shell commands were refused by permissions, so I didn't work around them and took sizes from shell globs instead. My first try at appending the friction line was also refused (a `cd` combined with a redirect); it went through when run from the worktree root.

**Budget:** 4 files changed against `max_files_changed: 3`. The extra files are the packet's own executor log and `friction.jsonl`, which this run requires me to update.

**Lessons for the Atlas:** the planner should check module size before issuing a single-card packet, since both `sdkjs-word` and `sdkjs-common` ended up as index cards. Having a `graph.json` would remove most of the open questions.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
