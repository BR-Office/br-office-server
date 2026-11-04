You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0132, described in .theseus/queue/ (search for PKT-0132). The changes to review are `git diff e06f164232eed354c942c65bda116e5de2989f3e..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I closed PKT-0132 as having no effect, which was the second option the review allowed. The change can't make the open measurably faster, so I reverted it rather than leave unproven code in place.

**Why:** the Comments view build that this packet moves out of the open window takes about 25 ms (measured in PKT-0112). With 30 alternating A/B pairs on a quiet VM, the smallest difference the measurement can detect is about 40 ms. Time-to-ready came out at −2 ms median (−5 ± 21 ms mean), with B faster in 30 of 60 pairs. None of the files this packet may change offers a larger saving.

**What I did:**
- **Reverted the code in `external/web-apps`:** I reverted all three commits on `pkt/PKT-0132`, including the PKT-0112 Comments deferral this packet was built on. The branch now has the same content as upstream `d238e526`.
- **Ran no new timing:** with the code reverted, the before and after builds are identical, so there was nothing to compare.
- **Kept the record:** the two earlier A/B runs and the add-button lock test (`perf/comments-addnew-locks.cjs`) stay committed. I added an "Outcome" section to `baseline.md` that says the change was reverted and why.
- **Packet log:** I wrote the decision in the Executor log, with a note for the operator that the packet should be closed without merging code, since the fork branch now carries only revert commits.

**Checks:** both acceptance commands pass after the revert (`documenteditor-open.sh`, and the differential oracle on 4 cases). `theseus validate` reports 0 errors and 4 warnings, which I didn't look into. `theseus scope-check` is ok. The friction line is appended and everything is committed as `e7fad9d`.

**Lesson for the Atlas** (added to the packet): a UI build under 30 ms can't be measured on this 2-CPU VM, so future open-window work should target items of about 100 ms or more. It would also help to check whether the expected effect is big enough to measure before a perf packet is queued.
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
differential: new      2b0d9bae (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/dd7510be8ba281bc543b18b0f6b3bb63f7ca968b-da39a3ee5e6b)
timing web-apps-documenteditor text.docx | original open=2642 join=3180 edit=3270 save=249 convert=225 reopen=2860 | new open=3292 join=3020 edit=3202 save=216 convert=194 reopen=2856
same text.docx dialogs
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx ui
same text.docx reopened
same text.docx converted
timing web-apps-documenteditor styles.docx | original open=3043 join=3124 edit=3303 save=303 convert=203 reopen=2870 | new open=3248 join=2872 edit=3030 save=211 convert=233 reopen=2856
same styles.docx dialogs
same styles.docx model
same styles.docx sentA
same styles.docx sentB
same styles.docx shown
same styles.docx ui
same styles.docx reopened
same styles.docx converted
timing web-apps-documenteditor plain.txt | original open=2853 join=2525 edit=2923 save=164 convert=129 reopen=2382 | new open=3145 join=2526 edit=3225 save=144 convert=154 reopen=2316
same plain.txt dialogs
same plain.txt model
same plain.txt sentA
same plain.txt sentB
same plain.txt shown
same plain.txt ui
same plain.txt reopened
same plain.txt converted
timing web-apps-documenteditor simple.rtf | original open=2755 join=2622 edit=3070 save=213 convert=130 reopen=2488 | new open=2750 join=2428 edit=3019 save=214 convert=158 reopen=2478
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
