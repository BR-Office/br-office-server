You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0111, described in .theseus/queue/ (search for PKT-0111). The changes to review are `git diff be4753ac95d8deeef57d902286ce353822d8a1bb..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
The code change works and both acceptance commands pass, but the packet's measurable goal is not met: LoadDoc does not drop by more than the run spread.

**What changed** (`external/web-apps` commit 9b58c858, `controller/Toolbar.js` only):
- Draw, Header & Footer and View are now added as tab headers with an empty panel. The tab list, captions and visibility are unchanged.
- Each panel is built once, by whichever comes first:
  - the first time the tab is opened, or a call to `buildDeferredTab(action)` (for plugins/API);
  - a 0 ms timer after `asc_LoadDocument` is issued (in practice this always wins);
  - the start of `Toolbar.onAppReady`, as a backstop.
- Locks already set on the toolbar (`disableOnStart`, `lostConnect`, …) are copied onto the late-built buttons.
- Forms, Review, Protect and Links are still built at startup. So is View when it is the viewer's opening tab.

**Decisions:**
- **Not built on first click.** HeaderFooterTab puts buttons into the Insert tab, ViewTab puts zoom buttons into other toolbar slots, and both tab views assume their panel exists by `app:ready`. Waiting for a click would empty part of Insert and crash at `app:ready`. Fixing that needs files outside the target, so "after `asc_LoadDocument`, before `app:ready`" is as late as this packet can go.
- **The backstop in `Toolbar.onAppReady` is safe** because that handler is registered at launch, before the tab views register theirs. One risk remains, written in the log: if `app:ready` ever came before the 0 ms timer, the late views would miss their own `app:ready` handler. I never saw it happen; it would need the document to finish loading first.

**Results** (15 runs per side, in `baseline.md`):
| | before | after |
|---|---:|---:|
| CPU of these three tabs before LoadDoc | ≈30–40 ms | ≈1 ms |
| large-100p LoadDoc (median) | 1 264 ms | 1 191 ms (inside a ≈300–600 ms spread) |
| medium-10p LoadDoc (median) | 1 222 ms | 1 224 ms |

- **Medium-10p early result was wrong.** The first medium runs showed a 0.8–1.2 s drop. Running the sides in reverse order made it disappear, so it came from run order, not from the change. The table uses the reversed-order runs.
- **Where the time really goes.** Most of the Toolbar's ≈200–250 ms before LoadDoc is the toolbar view drawing all its own panels (Insert, Layout, References), not these tab controllers. I recorded a follow-up request for that in `.theseus/spawn/`, needing `documentserver` and `browser`.

**Checks:**
- `documenteditor-open.sh` passes, but it opens the installed bundle, not this change.
- `differential/web-apps-documenteditor.sh` passes 4/4. One earlier run showed two co-editing differences while a timing run was going at the same time; it passed when run alone.
- The differential only compares the visible Home tab. So I ran a separate browser check with each build swapped in: opening draw, headerfooter, view and ins after load. It gave the same tabs, panels and button counts on both builds, no empty panels left over, the Header & Footer buttons still in Insert, and no console errors. That script stays in the session folder and is not committed.
- I added no unit test under `tests/unit`.
- `theseus scope-check` is clean. `theseus validate` shows 0 errors and 3 warnings that I did not look into.
- Executor log, baseline table, follow-up request and friction line are committed on the branch.

**Lessons for the Atlas:**
- Editor tabs depend on each other: some inject buttons into other tabs, and their views expect their panel to exist by `app:ready`.
- The Toolbar's cost before LoadDoc is mostly the toolbar view drawing its own panels.
- On this VM, LoadDoc drifts by up to ≈1 s with run order. Compare sides back to back with 15 runs and nothing else running.
- `perf/open-window.js` only measures the installed bundle, so comparing builds means swapping files under `/var/www` by hand (noted in my friction line).
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
differential: built web-apps documenteditor in 34 s
differential: original d238e526 (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/dd7510be8ba281bc543b18b0f6b3bb63f7ca968b-da39a3ee5e6b)
differential: new      9b58c858 (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/d63b322e47c7dc7a59224bf8665963462a6f3ee9-da39a3ee5e6b)
timing web-apps-documenteditor text.docx | original open=5557 join=6509 edit=4554 save=655 convert=886 reopen=6071 | new open=5697 join=6056 edit=5398 save=416 convert=936 reopen=5836
same text.docx dialogs
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx ui
same text.docx reopened
same text.docx converted
timing web-apps-documenteditor styles.docx | original open=6649 join=6131 edit=4800 save=485 convert=615 reopen=5063 | new open=4609 join=5927 edit=6077 save=1067 convert=485 reopen=5243
same styles.docx dialogs
same styles.docx model
same styles.docx sentA
same styles.docx sentB
same styles.docx shown
same styles.docx ui
same styles.docx reopened
same styles.docx converted
timing web-apps-documenteditor plain.txt | original open=5115 join=4844 edit=5204 save=701 convert=736 reopen=2692 | new open=3187 join=2832 edit=3206 save=244 convert=242 reopen=2786
same plain.txt dialogs
same plain.txt model
same plain.txt sentA
same plain.txt sentB
same plain.txt shown
same plain.txt ui
same plain.txt reopened
same plain.txt converted
timing web-apps-documenteditor simple.rtf | original open=3044 join=2953 edit=3450 save=316 convert=214 reopen=2869 | new open=3018 join=2843 edit=3394 save=316 convert=209 reopen=2780
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
