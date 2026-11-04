You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0125, described in .theseus/queue/ (search for PKT-0125). The changes to review are `git diff 89baa097e9e352960ff74ac6c0a107b99b00db07..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
Before LoadDoc, the Toolbar's CPU time (`ctlCode.LoadDoc.Toolbar`) now drops by more than its p25–p75 spread on both files: −50 ms on medium-10p (spread 42/45 ms) and −72 ms on large-100p (spread 55/43 ms). It was lower in all 5 blocks on each file. The drop is not larger than the full min–max range on either file. Both acceptance commands pass, and so does `theseus scope-check`. `theseus validate` reports one error, about `layout-finish-webapps` in another module's diagnosis file; it is unrelated and was already there.

**What changed** (fork commit 770b22f4; the repo commit 466b91e has the measurements, log, spawn request and friction line)
- **`view/Toolbar.js`:** the Insert and Layout buttons, pickers and spinners are now built after `asc_LoadDocument`, along with the page-break buttons. The trigger is a 0 ms timer after render, the first click on a tab other than Home, `app:ready` or `createDelayedElements`, whichever comes first. A probe confirmed the build starts 10–20 ms after the LoadDoc call.
  - Each deferred name is a getter until then, so any code that reads a button early still gets it (it just builds everything at that point).
  - Lock calls made before the build (such as `disableOnStart`) are replayed on the new controls.
  - The construction blocks were wrapped where they are rather than moved, to stay inside the 800-line budget.
- **`view/HeaderFooterTab.js`:** its buttons in the Insert-tab slots are now built at the same time. The button ids match the base build.
- **Not changed:** `ViewTab.js`, because in this base it puts nothing into Toolbar slots. `controller/Toolbar.js`, because its button event bindings already run after load.

**Two bugs found and fixed along the way.** An earlier A/B run showed no drop at all because the build was still running before LoadDoc:
- Render activates the Home tab, and that tab event ran the whole build. The handler now ignores Home.
- Render calls `onUpdateLastCustomMargins`, which reads the margins button and forced the build. It now runs as part of the deferred build.

**Checks**
- Comparing base and new tabs (Home, Insert, Layout, References, View): same visible controls, same disabled counts, same fixed ids, no page errors.
- The A/B run started at load 0.9, but load stayed at 3.4–4.8 throughout. Our own browser accounts for part of that, and another executor session was running. I did not wait for a fully idle machine.

**Limits, stated plainly**
- Total CPU before LoadDoc drops 46/53 ms, which is less than its ~100 ms spread.
- The LoadDoc and Ready timings move only within noise.
- Building the deferred controls takes only about 12–37 ms on its own. Most of what moved out of the window is putting them on the page plus that build. The remaining ~130–160 ms of Toolbar time is the Home panel, the template, and the Header & Footer and View panels.

**Follow-up:** I rewrote attempt 2's spawn request to cover what is left: building the Header & Footer and View panels after LoadDoc. The part it asked for before, deferring Insert/Layout construction, is done in this packet.

**Lessons for the Atlas** (in the packet log)
- In `web-apps-documenteditor`, render activates the Home tab and calls `onUpdateLastCustomMargins`. Either one undoes a deferral that is tied to tab events or to a getter.
- `console.warn` from the production editor frame never showed up in my Playwright probe. Writing to a `window` array and reading it with `frame.evaluate` worked.
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
differential: built web-apps documenteditor in 15 s
differential: original d238e526 (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/dd7510be8ba281bc543b18b0f6b3bb63f7ca968b-da39a3ee5e6b)
differential: new      770b22f4 (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/a4989b9926a1a71dc8844b7e919faacb2350e27f-da39a3ee5e6b)
timing web-apps-documenteditor text.docx | original open=3433 join=3555 edit=3474 save=247 convert=241 reopen=3689 | new open=3294 join=3504 edit=3649 save=320 convert=250 reopen=3231
same text.docx dialogs
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx ui
same text.docx reopened
same text.docx converted
timing web-apps-documenteditor styles.docx | original open=3295 join=3549 edit=3365 save=265 convert=244 reopen=3011 | new open=3186 join=3501 edit=3254 save=300 convert=210 reopen=3287
same styles.docx dialogs
same styles.docx model
same styles.docx sentA
same styles.docx sentB
same styles.docx shown
same styles.docx ui
same styles.docx reopened
same styles.docx converted
timing web-apps-documenteditor plain.txt | original open=3129 join=3050 edit=3220 save=283 convert=176 reopen=2642 | new open=3253 join=2810 edit=3181 save=157 convert=189 reopen=2524
same plain.txt dialogs
same plain.txt model
same plain.txt sentA
same plain.txt sentB
same plain.txt shown
same plain.txt ui
same plain.txt reopened
same plain.txt converted
timing web-apps-documenteditor simple.rtf | original open=3131 join=2765 edit=3587 save=209 convert=144 reopen=2880 | new open=2943 join=3171 edit=3391 save=292 convert=166 reopen=2737
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
