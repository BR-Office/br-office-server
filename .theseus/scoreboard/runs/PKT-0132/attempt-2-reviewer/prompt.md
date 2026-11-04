You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0132, described in .theseus/queue/ (search for PKT-0132). The changes to review are `git diff e06f164232eed354c942c65bda116e5de2989f3e..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I recommitted the lock test, but the change still shows no measurable speed-up: the review's main demand, a gain beyond the run-to-run spread, isn't met. With twice the samples, time-to-ready is unchanged.

**Lock test.** `.theseus/oracle/perf/comments-addnew-locks.cjs` is committed this time. It opens a document in the original build (A) and the changed one (B) and checks the Comments add button once the document has loaded:
- it is in `lockControls`, in `paragraphControls` and in the Toolbar controller's `btnsComment`;
- it is enabled after load, like the toolbar comment button;
- it turns off and back on with that button under the lost-connection and paragraph locks.

Both builds give identical results: PASS. One surprise: `btnsComment` is on the Toolbar controller, not on the view.

**Measurement.** 30 alternating A/B pairs × 2 documents (10 and 100 pages), up from 16, with no other factory agents running (load 2.0 before, about 5 at the end from the run itself). Deltas are B − A:

| | median | middle half of pairs | B faster in | mean ± standard error |
|---|---|---|---|---|
| Ready (editor ready) | −2 ms | −98 to +94 ms | 30 of 60 | −5 ± 21 ms |
| LoadDoc (document load call) | −32 ms | −167 to +62 ms | 34 of 60 | −44 ± 21 ms |

The −40 ms Ready result from the previous attempt shrinks to about zero with more pairs. Any real effect is under roughly 40 ms, about 1.5% of a ~3 s open. LoadDoc leans slightly faster, but that doesn't carry through to Ready.

**Decision.** I didn't change the code or the measurement to make a gain appear. The change does no harm, but it doesn't speed up opening either. I left keeping or dropping it to the reviewer and operator. The numbers and raw data (`perf/open-window-build-PKT-0132-2026-11-04-r3.json`) are in `baseline.md`, and the decision is in the Executor log.

**Checks.** Both acceptance commands pass (the differential oracle on 4 cases). `theseus scope-check` is clean. `theseus validate` reports 0 errors and 4 warnings, which I didn't look into. The friction line is appended, and the work is committed as `bef4896`. Nothing new in `external/web-apps` this attempt: it stays at `59da4221`, which already has the lock fix.

**Lessons for the Atlas:**
- In the document editor, reading `buttonAddNew` from Comments forces the view to build. A late-wired button must copy its `keepState` and disabled state from `btnsComment[0]`, because `ButtonsArray.add` applies a stale flag.
- 16 pairs gave a misleading −40 ms. Perf packets need about 30 or more pairs before claiming an effect.
- Nothing in the method says what to do with a perf packet whose measured effect is zero; I noted this in the friction line.
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
timing web-apps-documenteditor text.docx | original open=2900 join=2954 edit=3235 save=232 convert=207 reopen=2858 | new open=3289 join=3030 edit=3273 save=236 convert=185 reopen=2720
same text.docx dialogs
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx ui
same text.docx reopened
same text.docx converted
timing web-apps-documenteditor styles.docx | original open=2933 join=3080 edit=3226 save=255 convert=191 reopen=2759 | new open=2929 join=3093 edit=3185 save=234 convert=210 reopen=2739
same styles.docx dialogs
same styles.docx model
same styles.docx sentA
same styles.docx sentB
same styles.docx shown
same styles.docx ui
same styles.docx reopened
same styles.docx converted
timing web-apps-documenteditor plain.txt | original open=3042 join=2380 edit=2934 save=170 convert=138 reopen=2346 | new open=3167 join=2402 edit=3166 save=175 convert=151 reopen=2406
same plain.txt dialogs
same plain.txt model
same plain.txt sentA
same plain.txt sentB
same plain.txt shown
same plain.txt ui
same plain.txt reopened
same plain.txt converted
timing web-apps-documenteditor simple.rtf | original open=2773 join=2599 edit=2950 save=145 convert=131 reopen=2576 | new open=2598 join=2477 edit=3019 save=161 convert=258 reopen=2374
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
