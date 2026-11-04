You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0150, described in .theseus/queue/ (search for PKT-0150). The changes to review are `git diff f76cfecaffbcfa9307b45f63106e9034217971ce..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
The round 3 diagnosis for `web-apps-documenteditor` is written and committed (`771adbf`). The verdict is **keep**: none of the round 2 changes made opening a document measurably faster, and the new measurements explain why.

All acceptance commands pass. The two oracles (`documenteditor-open.sh` and the 4-case differential) passed when I ran them this session. `theseus validate` shows 0 errors and 4 warnings, none from this packet. `theseus scope-check` is clean.

**Caveat:** the VM was heavily loaded the whole time (load 10–14 on 2 CPUs, from other agents). Absolute times came out 1.5–2× round 2's on the same code. The findings below rest on proportions, and the delay test is suggestive rather than conclusive.

**What round 2 delivered.** The code is correct (both oracles pass), but there is no gain:

| Packet | Status | Measured effect |
|---|---|---|
| PKT-0111, toolbar tabs deferred | blocked | LoadDoc −60 / −100 ms, Ready +28 / +85 ms |
| PKT-0112, Comments deferred | blocked | LoadDoc −25 ms |
| PKT-0132, follow-up to PKT-0112 | discarded, reverted | Ready −2 ± 21 ms over 30 pairs |

LoadDoc is the moment the editor calls `asc_LoadDocument`; Ready is when the document is fully loaded. The fork is still at upstream `d238e526`.

**What round 3 found.**
- **The editor waits for the sdkjs engine, not for this module's UI.** LoadDoc happens when the 18 MB `sdk-all.js` download ends (2,707 ms vs 2,710 ms on the 10-page file). The ≈ 0.7 s of web-apps work before it runs while that download is still going.
- **Delaying LoadDoc did not delay Ready.** I added a test: a script that delays `asc_LoadDocument` by 500 ms, 7 alternating pairs per file. Ready moved +147 ms on the 10-page file and −729 ms on the 100-page file, against noise of about ±1.2 s.
- **Round 2's own exit rule applies.** It said to move to keep if the two deferrals together moved LoadDoc by less than 150 ms, and they did.

The numbers and the script are in `.theseus/oracle/rounds/web-apps-documenteditor-r3.md`.

**Decisions:**
- **Journey stages:** `covers: [editor-shell-boot]`. `client-open-webapps-ui` and `api-js-load` are under `not_covered`, each with its reason.
- **Plan:** a single investigate row, P1. It commits the delay script as `.theseus/oracle/perf/loaddoc-delay.js` and repeats the test on an idle VM. If Ready moves with the delay, the verdict switches to refactor: call `asc_LoadDocument` before the UI build.
- **Your call on existing packets:** I recommend closing PKT-0111 and PKT-0112 as having no effect, without merging their fork branches, as was done for PKT-0132. I also recommend discarding PKT-0125: it targets the same ≈ 220 ms of toolbar time, which runs during the sdkjs wait.
- **Not needed:** `DIAG-web-apps-documenteditor-b.md` did not exist, so there was nothing to `git rm`.
- **Not done:** I could not get an idle VM for this run, so the clean repeat of the test is left to P1. I made no prototype in `external/web-apps`.

**Lesson for the Atlas** (recorded in the packet): before planning cuts to UI work that runs before a mark like LoadDoc, check that it is on the critical path, by delaying the mark and seeing whether Ready moves.

The executor log and the friction line are written.
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
differential: new      d238e526 (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/dd7510be8ba281bc543b18b0f6b3bb63f7ca968b-da39a3ee5e6b)
timing web-apps-documenteditor text.docx | original open=5456 join=4404 edit=4061 save=331 convert=834 reopen=5845 | new open=4812 join=5297 edit=4912 save=1021 convert=570 reopen=5668
same text.docx dialogs
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx ui
same text.docx reopened
same text.docx converted
timing web-apps-documenteditor styles.docx | original open=3439 join=3482 edit=4289 save=392 convert=773 reopen=3872 | new open=2736 join=3290 edit=4637 save=1187 convert=981 reopen=6421
same styles.docx dialogs
same styles.docx model
same styles.docx sentA
same styles.docx sentB
same styles.docx shown
same styles.docx ui
same styles.docx reopened
same styles.docx converted
timing web-apps-documenteditor plain.txt | original open=5994 join=6801 edit=6304 save=911 convert=402 reopen=4654 | new open=6349 join=3464 edit=8260 save=580 convert=440 reopen=5171
same plain.txt dialogs
same plain.txt model
same plain.txt sentA
same plain.txt sentB
same plain.txt shown
same plain.txt ui
same plain.txt reopened
same plain.txt converted
timing web-apps-documenteditor simple.rtf | original open=6212 join=6257 edit=6145 save=464 convert=353 reopen=7874 | new open=6336 join=6073 edit=6190 save=443 convert=224 reopen=4688
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
- `git -C external/web-apps diff refs/theseus/base..HEAD` (branch pkt/PKT-0150 of the fork https://github.com/BR-Office/br-office-web-apps)
