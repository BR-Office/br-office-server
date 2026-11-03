You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0058, described in .theseus/queue/ (search for PKT-0058). The changes to review are `git diff 2b724460643d40fbd2051e5b8b4effc72250bdbd..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've finished PKT-0058: the acceptance oracle passes (6/6 suites, 10066/10323 assertions, 33 s, down from about 130 s) and `theseus validate` reports no errors.

**What the two suites turned out to be** (diagnosed in earlier attempts, recorded in the packet log):
- **color-mods is a test-precision problem, not a real defect.** Every failing check is off by exactly ±1 on one colour channel (0–255). sdkjs computes in floating point, while the expected values follow Office's fixed-point rounding. It can't go green without editing the test file, which is outside the target, so it stays in `known` with its 11 failing tests.
- **chartEx-serialize is a test bug, and it hangs every time.** It isn't slow and the environment isn't at fault. The page never loads `common/AllFonts.js`, so creating the API throws during page load and the tests never start. When I stubbed the missing fonts value, the suite finished in about 3 s but failed all 13 tests: the cell, slide and word scripts clash when loaded on one page, and `CChartSpace` has no XML serializer in this codebase. It stays in `known`.

**What changed this attempt:** the edits from earlier attempts weren't on this branch after the release, so I made them again:
- `.theseus/oracle/sdkjs-common-run.cjs`: chartEx's `known` entry now has `ms: 20000`, and the runner uses that as the timeout. Since the hang happens at load, waiting 120 s gained nothing.
- `.theseus/atlas/sdkjs-common.md`: records the diagnosis and the new timings.
- Packet Executor log and Lessons for the Atlas sections are filled in, and the friction line is added. My first friction line used the wrong format; I fixed it in a second commit.

Nothing under `external/sdkjs` was touched. I didn't record a new spawn request because PKT-0090 already exists to repair the two test pages.

**Lessons for the Atlas:**
- A QUnit page with autostart off that throws while loading looks like a slow run that timed out. Check the page errors before blaming the environment.
- color-mods expectations follow Office's fixed-point maths, so ±1 differences on a channel are precision, not defects.
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
- `git -C external/sdkjs diff refs/theseus/base..HEAD` (branch pkt/PKT-0058 of the fork https://github.com/BR-Office/br-office-sdkjs)
