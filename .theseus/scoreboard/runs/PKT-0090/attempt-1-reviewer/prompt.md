You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0090, described in .theseus/queue/ (search for PKT-0090). The changes to review are `git diff 1ddee7a1da2a554b55f0b647e511886e3f7a14ad..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0090 is done: both suites now pass and join the common oracle. The acceptance command `.theseus/oracle/sdkjs-common.sh` passes all 6 suites (10326/10326 assertions, about 16 s). `theseus validate` reports no errors and 2 warnings, which I did not look into.

Earlier attempts had already done this work, but none of it was left: the sdkjs branch was back at the base commit and the oracle edit was missing. I redid everything from the Executor log.

- **color-mods:** each case is now one assertion that allows a difference of ±1 on R, G, B and A. The sdk computes in floating point while the expected values follow Office's fixed-point rounding. The failure message prints the actual and expected colours, and the total stays 10023.
- **chartEx-serialize page:** it now loads only the slide scripts and sets `g_fonts_selection_bin = ""` before them. With that, `asc_docs_api` constructs and QUnit starts instead of hanging.
- **chartEx-serialize test:** "Compare 1xml" is now a skipped test with the reason in its name and in the code. `CChartSpace` only has generic placeholder `fromXml`/`toXml` methods and `toXml` throws, so no chartEx XML serializer exists here. Because a suite with only a skipped test would count as 0/0, I added a "Page boots" test with 3 assertions.
- **Oracle:** the `known` list of tolerated failures in `sdkjs-common-run.cjs` is now empty; the mechanism is kept for future cases.
- **Card:** I updated the two suite rows and the totals in `.theseus/atlas/sdkjs-common.md`.

The four api suites still pass, and after the run `git -C external/sdkjs status` shows only the three test files changed, so no product code was touched. The work is committed in `external/sdkjs` and in the main repo, with the Executor log and the friction line added.

**Not done:**
- The header comment of `.theseus/oracle/sdkjs-common.sh` still calls these two suites known-broken. That file is outside the target, so it needs a later packet.
- The follow-up request from earlier attempts, about the scope check diffing against the wrong base, is no longer in `.theseus/spawn/`. The packet notes say that bug was fixed in 0.20.0, so I did not file it again.
- The last existing line in `friction.jsonl` is labelled PKT-0058 but describes this packet's attempts. I left it as it was.

**Lessons for the Atlas:**
- color-mods expectations follow Office fixed point, so compare with ±1 on every channel, alpha included.
- chartEx-serialize now only checks that the page boots. Real chartEx XML coverage needs a serializer this codebase does not have.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>

Environments that are up right now (the factory just ran these checks and they passed; .theseus/adapter/environment.md says how to use them):
- `documentserver`: `curl -sf http://127.0.0.1/healthcheck`
- `browser`: `node -e "require('playwright')"`
Do not report one of these as missing: use it, and if a script points elsewhere (another port, a container), point it here. If you still cannot reach it, say exactly what you ran and what came back.

Part of this packet changes another repository, checked out (and git-excluded) in this worktree; review those changes too:
- `git -C external/sdkjs diff refs/theseus/base..HEAD` (branch pkt/PKT-0090 of the fork https://github.com/BR-Office/br-office-sdkjs)
