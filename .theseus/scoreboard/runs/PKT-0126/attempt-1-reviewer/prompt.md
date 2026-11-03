You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0126, described in .theseus/queue/ (search for PKT-0126). The changes to review are `git diff 2dd7ad3d559fe7d2ada5132178b1edfab18164ce..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've mapped the open-docx-10p journey end to end and committed it as `49a4c09`. All four acceptance commands pass, and `theseus validate` gives 0 errors and 9 warnings, none of them about this packet. `theseus scope-check` is ok.

**Result:** `bash .theseus/oracle/journeys/open-docx-10p.sh` prints `total_ms=8340 min_ms=5699 max_ms=8547 runs=5`. That is against the integrated build: the sdkjs word bundle from the fork's branch (commit 0f61ccce) on top of the native package. For core (x2t) and web-apps the collecting branch is identical to main, so the packaged build already is the integrated one.

**The runner was broken, not just slow.** The script kept from the interrupted run hung forever, for two reasons:
- **Page count:** this build lays out the "10-page" sample as **9 pages**, and the runner waited for 10.
- **No cleanup on error:** it never closed the browser after a failure, so one bad run froze the whole script.

It now waits until the layout recalculation has finished (`CDocument.FullRecalc.Id == null`), records the page count, and closes the browser in every case. One 10-minute background run died silently before I found this.

**The map** is in `.theseus/journeys/open-docx-10p.md`: 12 stages that add up to exactly 8340 ms, with `unattributed_ms: 0`.

| Module | ms | Share |
|---|---|---|
| project (example service, nginx, browser) | 2801 | 33.6% |
| web-apps-documenteditor | 2312 | 27.7% |
| sdkjs-word | 1798 | 21.6% |
| sdkjs-common | 592 | 7.1% |
| docservice | 538 | 6.5% |
| x2t | 299 | 3.6% |

- **Largest single stage:** the example service's `/example/editor` page, 1.9 s at the median, varying from 0.1 to 3.1 s between runs.
- **x2t time** comes from the converter log, not from my timing marks.

**What is estimated rather than measured:**
- **The 2.5 s after Editor.bin arrives** is split between sdkjs-word, sdkjs-common, web-apps and the browser using the CPU-profile shares from PKT-0043, which profiled the packaged build. The map labels this as an estimate. I recorded a follow-up request in `.theseus/spawn/` to profile this window on the integrated build; it needs the `documentserver` and `browser` environments.
- **Absolute numbers:** another agent was running a heavy test at the same time (load average about 6 on 2 CPUs). Read the shares, not the ms, until it is re-run on a quiet machine.
- **Comparison:** there was no earlier journey map. I compared with the baseline (3.15 s, measured differently) and the round-2 shares, which agree: after Editor.bin, word layout comes first and fonts second.

The integrated overlay is left in place on the Document Server (`serve-integrated.sh down` restores the packaged build).

**Lessons for the Atlas:**
- Wait on layout state, never on a fixed page count: this sample is 9 pages here.
- The example service page is the noisiest stage and follows the machine load.
- The converter log gives the x2t time per run for free.
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
