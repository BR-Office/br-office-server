You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0125, described in .theseus/queue/ (search for PKT-0125). The changes to review are `git diff 89baa097e9e352960ff74ac6c0a107b99b00db07..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
The code change is in and both acceptance commands pass, but the goal's numeric bar is only half met. On medium-10p the Toolbar's CPU before `asc_LoadDocument` drops 51 ms, just over its run spread. On large-100p it drops 39 ms, which is not more than its spread. The LoadDoc mark itself doesn't move.

**What I did**
- **Code:** The previous attempt's code survived on the fork, so I reused it (commit 0fc7c875, `view/Toolbar.js` only). It builds the Insert, Layout and References panels after `asc_LoadDocument`, or earlier if their tab is opened or the app becomes ready. I checked the ordering: in edit mode the toolbar render and `asc_LoadDocument` run in one uninterrupted call chain in `Main.js`, so the deferred build really does run after LoadDoc.
- **Measurement:** I wrote `perf/toolbar-ab.sh`. It swaps the original and new builds of the editor's `app.js` into the running server in turns (5 blocks × 3 runs = 15 opens per side per file), retries an open that times out, and puts the installed file back at the end. The table is in `baseline.md`, the raw runs in `perf/toolbar-ab-2026-11-04/`.
- **Results** (p25–p75 is the middle half of the 15 runs):

| file | Toolbar CPU before LoadDoc, original → new | drop | p25–p75 spread | blocks where new was lower |
|---|---|---|---|---|
| medium-10p | 203 → 152 ms | 51 ms | 48 / 42 ms | 5 of 5 |
| large-100p | 196 → 157 ms | 39 ms | 51 ms | 3 of 5 |

  - The LoadDoc mark and the time to Ready stay within noise.
  - Total busy CPU before LoadDoc falls 34 ms on medium-10p and 44 ms on large-100p.
- **Machine load:** my first run overlapped another packet (load 5–9) and the noise swamped the result. I waited for the machine to go idle (load under 2) and re-ran. Another packet started during the re-run (load 3–5), but alternating the sides spreads that load over both.
- **Acceptance:** the differential check passes on all 4 cases. `documenteditor-open.sh` passes on the installed build and again with the new `app.js` swapped in; I restored the original file afterwards.
- **Repo checks:** `theseus scope-check` is clean. `theseus validate` shows one error, in the diagnosis file for this module, which I didn't touch.

**Decisions**
- I left `HeaderFooterTab.js`, `ViewTab.js` and `controller/Toolbar.js` unchanged. The buttons they inject go into slots that already exist in the page template before the panel is filled, so they still work. Moving them would save only about 10–20 ms.
- I requested a follow-up packet (in `.theseus/spawn/`): create the non-Home buttons only when they're first needed. Building those buttons is the bigger remaining cost (next section). The controllers attach handlers to those buttons at startup, so that packet has to move those bindings too.

**Lessons for the Atlas**
- Most of the Toolbar's roughly 200 ms before LoadDoc is spent creating the button objects (75 buttons plus pickers, for every tab) when the toolbar view is set up, not on putting the panels into the page. Deferring the panels alone saves only 40–55 ms.
- The Toolbar CPU figure only counts work called from a controller, so code moved into a timer drops out of it either way. Check total busy CPU before LoadDoc as well.
- On this 2-CPU machine, a measurement needs to alternate the two builds, and ideally no other packet running. Nothing reserves the machine for measurement packets; I noted that in my friction line.

The packet log records all of this, including that the large-file bar is not met.
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
differential: new      0fc7c875 (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/d8aa8cc68475d3130fc1cee51535a3009c75b9e1-da39a3ee5e6b)
timing web-apps-documenteditor text.docx | original open=3217 join=3416 edit=3216 save=398 convert=316 reopen=3267 | new open=3294 join=3340 edit=3280 save=237 convert=185 reopen=3156
same text.docx dialogs
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx ui
same text.docx reopened
same text.docx converted
timing web-apps-documenteditor styles.docx | original open=3342 join=3136 edit=3307 save=250 convert=194 reopen=3075 | new open=3410 join=3312 edit=3060 save=276 convert=236 reopen=3341
same styles.docx dialogs
same styles.docx model
same styles.docx sentA
same styles.docx sentB
same styles.docx shown
same styles.docx ui
same styles.docx reopened
same styles.docx converted
timing web-apps-documenteditor plain.txt | original open=2771 join=2779 edit=2981 save=190 convert=164 reopen=2673 | new open=3126 join=2776 edit=3430 save=229 convert=155 reopen=2401
same plain.txt dialogs
same plain.txt model
same plain.txt sentA
same plain.txt sentB
same plain.txt shown
same plain.txt ui
same plain.txt reopened
same plain.txt converted
timing web-apps-documenteditor simple.rtf | original open=2854 join=2844 edit=3269 save=192 convert=177 reopen=2765 | new open=2888 join=3053 edit=3168 save=236 convert=134 reopen=2632
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
- `git -C external/web-apps diff refs/theseus/base..HEAD` (branch pkt/PKT-0125 of the fork https://github.com/BR-Office/br-office-web-apps)
