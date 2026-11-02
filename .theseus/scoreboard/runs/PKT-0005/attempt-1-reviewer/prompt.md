You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0005, described in .theseus/queue/ (search for PKT-0005). The changes to review are `git diff 32d3256eb901f3dd35fb4523bf520cab24248abd..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0005 is finished: my verdict for `docservice` is **refactor**, with medium confidence, on condition that the code's current behaviour is pinned down with tests first. The acceptance check (`test -s .theseus/diagnosis/DIAG-docservice.md`) passes, and the work is committed as `55c5332`.

**Why refactor:**
- **Maintenance cost (5/5, weight 0.25):** `DocsCoServer.js` is 4,736 lines that mix sockets, licensing, force-save and shutdown, all sharing global module state. It also mixes about 65 old generator-style calls with async/await.
- **Test coverage (2/5):** `DocsCoServer.js`, `canvasservice.js`, `converterservice.js` and `wopiClient.js` have no direct tests.
- **Security (3/5):** the module handles untrusted input (JWT checks, uploads, the AI proxy, WOPI), but these are logic and auth risks, so tests help more than a language change.

**What I ruled out:**
- **Migrating to TypeScript:** rejected for now. With no tests on the core files, there's no way to prove the converted code behaves the same. I'd look at it again once the big file is split and tested.
- **Rewrite:** the socket.io protocol with the editors and the WOPI contract are too large and too loosely specified.
- **Keep:** the maintenance pain is too high for a module the project's goals name explicitly.

**Packet plan (6 packets):**
- **Wave 0:**
  - Three tests that record current behaviour: the HTTP command/convert endpoints, `canvasservice`, and `wopiClient`.
  - One investigation into two oddities. Line 154 of `DocsCoServer.js` falls back to the wrong storage class for EditorStat, and `package.json` lists an `editorDataRedis.js` that doesn't exist.
- **Wave 1:** two refactors. One moves force-save and shutdown out of `DocsCoServer.js`; the other converts the generator-style code to async/await.

**Not done, because both files are outside my target:**
- I did not add the line to `.theseus/scoreboard/friction.jsonl`; the friction points are in the packet's Executor log instead.
- I did not update `SUMMARY.md`.

No commands were refused.

**Lessons for the Atlas:**
- The 90-day change count (`churn_90d`) is meaningless in this fork, because history restarts from upstream with one commit per file. Don't use it to score maintenance cost until real history builds up.
- Without a dependency graph or metrics, sizes had to come from raw line counts. A tool should generate these before the next diagnosis.
- `DocsCoServer.js` deserves its own submodule card.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
