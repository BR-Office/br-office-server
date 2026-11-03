You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0111, described in .theseus/queue/ (search for PKT-0111). The changes to review are `git diff be4753ac95d8deeef57d902286ce353822d8a1bb..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
Both acceptance commands pass, but **the Goal's bar is still not met**: LoadDoc does not drop by more than the run spread. I don't think toolbar work alone can meet it on this VM, explained below.

**What changed this attempt**
- **`view/Toolbar.js`** (the cost the reviewer pointed at): at startup the toolbar now draws only the Home panel's buttons. The Insert, Layout and References buttons are drawn the first time their tab opens (`renderDeferredPanels(tab)` from `setTab`). As a fallback, all of them are drawn at the start of the view's `onAppReady` and `createDelayedElements`; both run after `asc_LoadDocument`. The button objects are still created at startup, so the controller's event bindings and lock/disabled states don't change.
- **Two buttons stay eager:** `btnContentControls` and `btnPageColor`. Their pickers are only built if the button is already drawn, and the controller binds one of them at launch. My first build crashed on exactly this; the differential oracle caught it and the open oracle didn't.
- **Controller `setTimeout(0)` kept.** The reviewer objected to it, but removing it would move the Draw, Header & Footer and View build into the `app:ready` dispatch. Views created at that point would miss their own `app:ready` handler and break. The timer runs after `asc_LoadDocument` is issued, so it doesn't delay LoadDoc.

**Measurement**
I added `.theseus/oracle/perf/open-window-ab.js`, which serves the two builds side by side and alternates their order in each pair. That removes the batch drift that faked a 0.8–1.2 s "drop" last time. Results are in `baseline.md`, 15 pairs per file:

| file | LoadDoc change, median [IQR] | Ready change |
|---|---:|---:|
| medium-10p | −60 ms [−127, −19] | +28 ms |
| large-100p | −100 ms [−182, +31] | +85 ms |

- On medium the drop is real: the whole IQR is below zero. On large it isn't conclusive.
- Both drops are well inside the ≈300–500 ms min-max spread.
- A profile shows the Toolbar's whole pre-LoadDoc cost is about 220 ms. Even deferring all of it could not clear a min-max bar of 300 ms or more.
- Ready rises slightly because the work now runs after LoadDoc.

**Checks**
- `documenteditor-open.sh` passes. `web-apps-documenteditor.sh` passes on all 4 cases.
- A one-off browser check opened every tab after load on both builds. Panels, button counts and disabled counts were identical, nothing was left undrawn, and there were no page errors.
- `theseus validate` reports 0 errors and `theseus scope-check` is clean.

**Not done**
- No unit test: it would need the full editor running.
- Building the HTML for all panels at startup is still a cost, but that template is outside the target.
- Decision for you or the planner: re-state the Goal's bar as the paired median drop, or close this packet and continue in the spawned follow-up.

**Lessons for the Atlas** (in the packet log)
- `onToolbarAfterRender` and controller launch bindings assume some buttons in non-Home tabs are already drawn, so lazy drawing needs an exception list.
- Backbone handlers added while `app:ready` is being dispatched don't fire, which limits how late the tab views can be built.
- For A/B timing on this VM, use paired, alternating runs; min-max over one batch can't detect changes under ≈300 ms.

Commits: `external/web-apps` (view change) and here 464ef31 and fdb3d47 (baseline, packet log, A/B script, friction line).
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
differential: built web-apps documenteditor in 20 s
differential: original d238e526 (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/dd7510be8ba281bc543b18b0f6b3bb63f7ca968b-da39a3ee5e6b)
differential: new      2efc363a (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/4256e47004ec48bca5359367dcfa48ab4b7bea28-da39a3ee5e6b)
timing web-apps-documenteditor text.docx | original open=3218 join=3342 edit=3342 save=344 convert=373 reopen=3249 | new open=3292 join=3261 edit=3361 save=297 convert=266 reopen=2952
same text.docx dialogs
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx ui
same text.docx reopened
same text.docx converted
timing web-apps-documenteditor styles.docx | original open=3267 join=3190 edit=3367 save=445 convert=330 reopen=3140 | new open=3109 join=3278 edit=3414 save=314 convert=359 reopen=3946
same styles.docx dialogs
same styles.docx model
same styles.docx sentA
same styles.docx sentB
same styles.docx shown
same styles.docx ui
same styles.docx reopened
same styles.docx converted
timing web-apps-documenteditor plain.txt | original open=3018 join=2534 edit=3279 save=253 convert=231 reopen=2469 | new open=3140 join=2717 edit=3189 save=430 convert=242 reopen=2655
same plain.txt dialogs
same plain.txt model
same plain.txt sentA
same plain.txt sentB
same plain.txt shown
same plain.txt ui
same plain.txt reopened
same plain.txt converted
timing web-apps-documenteditor simple.rtf | original open=2788 join=2709 edit=2984 save=284 convert=244 reopen=2514 | new open=2777 join=2854 edit=3105 save=293 convert=217 reopen=2870
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
- `git -C external/web-apps diff refs/theseus/base..HEAD` (branch pkt/PKT-0111 of the fork https://github.com/BR-Office/br-office-web-apps)
