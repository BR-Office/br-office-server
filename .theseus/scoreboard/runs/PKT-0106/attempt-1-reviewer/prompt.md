You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0106, described in .theseus/queue/ (search for PKT-0106). The changes to review are `git diff 856623d6a98f7308dd2545056fad953b2a69a721..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0106 is finished and committed. All acceptance commands pass: the five file checks, the open-sequence oracle and the differential oracle. `theseus scope-check` passes, and `theseus validate` reports 0 errors and 2 warnings.

**Verdict: refactor, now without conditions (confidence medium).** It is written in `.theseus/diagnosis/DIAG-web-apps-documenteditor.md`. Round 1's condition was that this module's share of the time before the document is requested be over 200 ms. It is about 0.9 s of the roughly 1.1 s of busy time before the editor asks for the document, and round 2 measured the same split again. The toolbar build and the Comments startup are the biggest single items.

**What round 1 did and did not deliver:** it produced measurements and two oracles but changed no code, so it made nothing faster. The original and new web-apps are the same commit (`d238e526`). That means the differential oracle passes on all 4 cases but only shows noise: up to ±0.7 s per open on identical code.

**Round 2 numbers**, in `.theseus/oracle/rounds/web-apps-documenteditor-r2.md`:
- The document is requested 1.20–1.25 s after the page starts loading, and is ready at 3.3–3.9 s.
- Busy time before that request:

| Part | ms |
|---|---|
| jQuery and other vendor files | 386–414 |
| documenteditor's own code | 148–152 |
| apps/common code | 150–166 |
| Script parse and compile | 171–220 |
| sdkjs | 68–72 |

**Next-round plan** (all JavaScript, in `external/web-apps`):
- **P1:** build the toolbar tabs that are not shown until they are first opened.
- **P2:** move the Comments build to after the document has loaded.
- **P3 (wave 1):** cut the caption width measuring in `Button.js`, if the toolbar still costs more than 150 ms after P1.

Each must pass both oracles. It also needs a before/after of `perf/open-window.js` over 5 runs, because single runs are too noisy. If P1 and P2 together gain less than 150 ms, the verdict becomes keep. If an earlier document request does not make the document ready sooner, the work moves to sdkjs.

**Other:** there was no `-b` diagnosis to delete. The executor log is filled in and the friction line is appended. No source code changed.

**Lessons for the Atlas:**
- A round that only measures delivers no speed. Once its condition is met, the next round must plan code changes.
- On this 2-CPU VM, a gain under about 0.5 s only shows up over repeated `open-window.js` runs, not in the differential oracle's single-run timings.
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
timing web-apps-documenteditor text.docx | original open=3768 join=4061 edit=3538 save=385 convert=317 reopen=3952 | new open=3745 join=3554 edit=3176 save=293 convert=339 reopen=3268
same text.docx dialogs
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx ui
same text.docx reopened
same text.docx converted
timing web-apps-documenteditor styles.docx | original open=4095 join=3850 edit=3750 save=471 convert=393 reopen=4035 | new open=3661 join=3651 edit=3273 save=367 convert=447 reopen=3271
same styles.docx dialogs
same styles.docx model
same styles.docx sentA
same styles.docx sentB
same styles.docx shown
same styles.docx ui
same styles.docx reopened
same styles.docx converted
timing web-apps-documenteditor plain.txt | original open=3685 join=2736 edit=3480 save=481 convert=278 reopen=2965 | new open=3056 join=2727 edit=3357 save=363 convert=224 reopen=2848
same plain.txt dialogs
same plain.txt model
same plain.txt sentA
same plain.txt sentB
same plain.txt shown
same plain.txt ui
same plain.txt reopened
same plain.txt converted
timing web-apps-documenteditor simple.rtf | original open=3114 join=3611 edit=3359 save=388 convert=259 reopen=3074 | new open=3042 join=2865 edit=3307 save=255 convert=249 reopen=2838
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
For a performance goal, reject when the measured difference against the original is absent or zero: a change that is correct but does not make what users do faster or safer does not meet the goal.

Part of this packet changes another repository, checked out (and git-excluded) in this worktree; review those changes too:
- `git -C external/web-apps diff refs/theseus/base..HEAD` (branch pkt/PKT-0106 of the fork https://github.com/BR-Office/br-office-web-apps)
