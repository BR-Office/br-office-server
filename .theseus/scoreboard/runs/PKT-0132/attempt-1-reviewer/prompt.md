You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0132, described in .theseus/queue/ (search for PKT-0132). The changes to review are `git diff f038f07d62b1517b21b1cf4bd6e27bd6ea81285d..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I finished PKT-0132 and committed it in both repos. Both acceptance checks pass, scope-check is clean (rule R2) and `theseus validate` reports no errors. The speed gain is still not proven, though: I measured on a busy VM, and the improvement is smaller than the run-to-run spread.

**Recovery.** The previous attempt's main-repo work was missing and `external/web-apps` was back at upstream. I cherry-picked the two Comments/Toolbar commits from `fork/pkt/PKT-0132`. The PKT-0112 deferral comes with them, since that packet is blocked and its change wasn't on this branch. I took `perf/open-window-build.js` from `d926db4`.

**Lock bug from the review.**
- The add button was already being added to `lockControls` and `paragraphControls` when it got wired late, so that part of the rejection was handled.
- When I tested it after load, a second bug showed up: the Comments panel's add button stayed disabled while the toolbar's comment button was enabled. The cause is that `ButtonsArray.add` applies the button set's own disabled flag, which is still "disabled" from start-up.
- Fix in `Toolbar.js`: after adding the button, copy the locks and the disabled state from the toolbar's comment button.
- I added `perf/comments-addnew-locks.cjs` to check this. With the fix, the button behaves exactly like the upstream build after load, and when connection-lost and paragraph locks are turned on and off.

**When the panel gets built.** When the document finishes loading (`isDocumentLoadComplete`), the Comments panel isn't built yet. An idle callback builds it after `app:ready`, so the build no longer runs in the open window.

**Measurement.** I compared upstream (A) against this branch (B) over 16 pairs of runs on each of two documents, alternating the order. Deltas are B − A, also written to `baseline.md`:

| | Median change | Runs faster | Spread (IQR) |
|---|---|---|---|
| Ready | −84 ms | 20 of 32 | −252 to +286 ms |
| LoadDoc | +2 ms | 16 of 32 | — |

LoadDoc wasn't expected to move, because the Toolbar wiring runs after it. The VM's load average was 3.4–6.0 the whole time because other factory agents were running. The reviewer asked for an idle VM and I couldn't get one, so that part of the rejection is still open. I said so in the Executor log and the friction line.

**Lessons for the Atlas:**
- A button added to a button set after start-up has to be re-synced from a sibling button, because the set forces its stale disabled flag onto it.
- Performance A/B runs need an idle slot from the factory. With other agents running in parallel, the run-to-run spread is wider than a ~100 ms effect.
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
differential: built web-apps documenteditor in 13 s
differential: original d238e526 (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/dd7510be8ba281bc543b18b0f6b3bb63f7ca968b-da39a3ee5e6b)
differential: new      bb2fe12d (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/00ee3de70b4887cc700c4c9c628a64b8a3642c34-da39a3ee5e6b)
timing web-apps-documenteditor text.docx | original open=3445 join=5105 edit=4462 save=513 convert=240 reopen=2975 | new open=3237 join=4336 edit=4811 save=225 convert=193 reopen=2948
same text.docx dialogs
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx ui
same text.docx reopened
same text.docx converted
timing web-apps-documenteditor styles.docx | original open=3137 join=4313 edit=4035 save=406 convert=316 reopen=4484 | new open=2925 join=2918 edit=4243 save=2273 convert=258 reopen=4922
same styles.docx dialogs
same styles.docx model
same styles.docx sentA
same styles.docx sentB
same styles.docx shown
same styles.docx ui
same styles.docx reopened
same styles.docx converted
timing web-apps-documenteditor plain.txt | original open=2899 join=2427 edit=3374 save=375 convert=139 reopen=4667 | new open=3130 join=2694 edit=3106 save=196 convert=165 reopen=3064
same plain.txt dialogs
same plain.txt model
same plain.txt sentA
same plain.txt sentB
same plain.txt shown
same plain.txt ui
same plain.txt reopened
same plain.txt converted
timing web-apps-documenteditor simple.rtf | original open=3997 join=3537 edit=3167 save=150 convert=169 reopen=2389 | new open=3807 join=5575 edit=4173 save=220 convert=158 reopen=2613
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
