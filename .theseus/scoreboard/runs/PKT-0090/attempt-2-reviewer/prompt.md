You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0090, described in .theseus/queue/ (search for PKT-0090). The changes to review are `git diff 1ddee7a1da2a554b55f0b647e511886e3f7a14ad..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I fixed both reasons for the rejection. The acceptance command `.theseus/oracle/sdkjs-common.sh` passes: 6 of 6 suites, 10327 of 10327 assertions. `theseus validate` reports no errors.

- **Test for the surprise:** the "Page boots" test in `external/sdkjs/tests/common/charts/chartEx-serialize.js` now has an `assert.throws`. It sends a `CChartSpace` through the same path the skipped "Compare 1xml" test uses (`XmlWriterContext` plus `OpenXmlPackage.getXmlBytes`), and that call throws. The suite is 4/4. If the test ever starts failing, a real serializer exists and "Compare 1xml" can be turned back on.
- **Surprise corrected:** calling `toXml` directly does *not* throw. The generic stub just writes an empty node. The throw only happens through `getXmlBytes` with the writer context, so the test uses that path. I fixed the code comment, and the packet log now says this too, because the earlier entry said `toXml` itself throws.
- **Follow-up filed:** `.theseus/spawn/PKT-0090-update-stale-header-comment-of-sdkjs-common-sh-o.md` asks for the outdated header comment in `.theseus/oracle/sdkjs-common.sh` to be rewritten (it still calls the two suites known broken). It declares `requires: [browser]`. `theseus packet new` has no chore type, so I filed it as `refactor`.
- **Records:** the Executor log is updated, and my friction line is in `.theseus/scoreboard/friction.jsonl`. Both repositories are committed, `external/sdkjs` on its own branch.

`theseus validate` still shows one warning that touches this packet: the Atlas card `.theseus/atlas/sdkjs-common.md` is 852 words, over the 800 limit (rule A2). I didn't change the card in this attempt.

**Lessons for the Atlas:** the chartEx "toXml throws" behaviour only happens through `getXmlBytes`, not a direct call. Also, the color-mods expected values follow Office's fixed-point rounding, so they need ±1 on every channel including alpha.
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
