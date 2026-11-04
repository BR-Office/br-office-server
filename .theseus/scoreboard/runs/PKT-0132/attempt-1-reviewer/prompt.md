You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0132, described in .theseus/queue/ (search for PKT-0132). The changes to review are `git diff e06f164232eed354c942c65bda116e5de2989f3e..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0132 is ready for review. Both acceptance commands pass and the scope check is clean, but on a quiet VM the speed-up is small and not clearly beyond the run-to-run spread. The lock-test script from attempt 2 is lost and was not rewritten.

**What I did**
- **Recovered the code:** the previous attempt's work was again missing from this branch (`external/web-apps` was back at upstream). I cherry-picked the three web-apps commits from `fork/pkt/PKT-0132`:
  - the deferred Comments build and the Toolbar wiring of the add button once Comments is built;
  - adding the late-wired button to the toolbar's lock lists (`paragraphControls`/`lockControls`);
  - copying the toolbar comment button's disabled state onto it, so it no longer stays disabled after load.
- **Restored the measuring script:** `perf/open-window-build.js` came back from commit `d926db4`.
- **Remeasured:** A was upstream `d238e526`, B was this branch, 16 alternating pairs on each of two documents. No other factory agent was running; load was about 1 before, and 3–4 during the run from the browser and server themselves on 2 CPUs.

**Results** (B − A per pair, median [middle 50% range]):

| | LoadDoc | Ready |
|---|---|---|
| 10-page doc | +4 ms [−89…+94] | −21 ms [−110…+34] |
| 100-page doc | −46 ms [−121…+12] | −63 ms [−156…+13] |
| both together | −40 ms [−107…+68] | −40 ms [−123…+34] |

B was faster in 19 of 32 pairs for Ready. That leans towards a small gain (about 1.3% of ~3 s), but the range still crosses zero. Last attempt's −84 ms was measured with other agents running; on the quiet VM the spread is about 4× narrower and the gain shrank with it. The table, the raw runs (`perf/open-window-build-PKT-0132-2026-11-04.json`) and this reading are in `baseline.md`.

**Checks**
- `documenteditor-open.sh` passes.
- `differential/web-apps-documenteditor.sh` passes (4 cases).
- `theseus scope-check` is clean and `theseus validate` reports 0 errors (my first friction line had the wrong shape; I fixed it).

**Not done:** `perf/comments-addnew-locks.cjs`, the after-load lock test from attempt 2, was never committed and is lost. The lock fix itself is kept. The executor log says this, so the reviewer may ask for the test again.

**Lessons for the Atlas** (in the executor log only; I did not add a separate Atlas note):
- In the document editor the Comments view is not built yet when loading completes (`isDocumentLoadComplete`); it gets built in the idle callback after the app's ready event.
- A/B timings on this 2-CPU VM need an exclusive slot, or other agents' noise hides effects this small.
- For the second time, an attempt's main-repository work did not carry over to the next attempt; the three web-apps commits were only recoverable from the fork branch.

The work is committed on `pkt/PKT-0132`, with the friction line appended.
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

The differential oracle compared the original code with this packet's code (with everything already merged into the fork) on the same inputs. Its output:
<differential>
differential: original d238e526 (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/dd7510be8ba281bc543b18b0f6b3bb63f7ca968b-da39a3ee5e6b)
differential: new      59da4221 (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/00ee3de70b4887cc700c4c9c628a64b8a3642c34-da39a3ee5e6b)
timing web-apps-documenteditor text.docx | original open=2800 join=2876 edit=3271 save=227 convert=207 reopen=2811 | new open=3404 join=3097 edit=3271 save=196 convert=192 reopen=2900
same text.docx dialogs
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx ui
same text.docx reopened
same text.docx converted
timing web-apps-documenteditor styles.docx | original open=3063 join=3312 edit=3167 save=279 convert=253 reopen=2706 | new open=3266 join=3192 edit=3133 save=354 convert=218 reopen=2908
same styles.docx dialogs
same styles.docx model
same styles.docx sentA
same styles.docx sentB
same styles.docx shown
same styles.docx ui
same styles.docx reopened
same styles.docx converted
timing web-apps-documenteditor plain.txt | original open=3154 join=2335 edit=2991 save=152 convert=165 reopen=2334 | new open=2983 join=2507 edit=3071 save=251 convert=138 reopen=2299
same plain.txt dialogs
same plain.txt model
same plain.txt sentA
same plain.txt sentB
same plain.txt shown
same plain.txt ui
same plain.txt reopened
same plain.txt converted
timing web-apps-documenteditor simple.rtf | original open=2628 join=2554 edit=2936 save=249 convert=131 reopen=2380 | new open=2748 join=2480 edit=3109 save=246 convert=127 reopen=2535
same simple.rtf dialogs
same simple.rtf model
same simple.rtf sentA
same simple.rtf sentB
same simple.rtf shown
same simple.rtf ui
same simple.rtf reopened
same simple.rtf converted
differential web-apps-documenteditor: PASS (4 cases)
</differential>
For a performance goal, reject when the measured difference against the original is absent or zero: a change that is correct but does not make what users do faster or safer does not meet the goal. A difference smaller than the spread between repeated runs of identical code is not a gain.

Part of this packet changes another repository, checked out (and git-excluded) in this worktree; review those changes too:
- `git -C external/web-apps diff refs/theseus/base..HEAD` (branch pkt/PKT-0132 of the fork https://github.com/BR-Office/br-office-web-apps)
