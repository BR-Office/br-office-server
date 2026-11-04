You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0111, described in .theseus/queue/ (search for PKT-0111). The changes to review are `git diff be4753ac95d8deeef57d902286ce353822d8a1bb..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I made no code change on attempt 3. The Goal's bar (LoadDoc must drop by more than the run spread) can't be reached by changing these target files, and both rejections point to the planner as the fix.

**Why the bar can't be met:**
- The spread between runs is about 300–600 ms, but the Toolbar costs only about 220 ms of its own time before LoadDoc (about 500 ms counting the calls it makes). Deferring parts of it can't free enough time. Even removing the Toolbar entirely would barely reach the spread.
- What remains is drawing the HTML of every panel. That HTML comes from `Toolbar.template`, which is outside `target.files`. Moving it is the follow-up already requested in `.theseus/spawn/`.
- A third rewrite of the same files would only move LoadDoc by tens of ms again.

**What the earlier attempts' work already does:**
- **Draw, Header & Footer and View tabs:** built after LoadDoc starts, or the first time they're opened (`controller/Toolbar.js`).
- **Buttons on the other hidden panels:** rendered the first time their tab is opened, or when the app finishes loading, whichever comes first (`view/Toolbar.js`).
- **Measured effect:** median drop over paired before/after runs is −60 ms on medium-10p and −100 ms on large-100p. On medium the middle half of the runs is entirely below zero (−127 to −19 ms); on large it isn't (−182 to +31 ms).

**Checks this attempt:** `documenteditor-open` PASS, differential PASS (4 cases), `theseus scope-check` OK, `theseus validate` reports 0 errors (3 warnings). I committed the Executor log and the friction line as `5e6f9af`.

**Decision needed from the planner or reviewer:** either:
- restate the bar as a paired-median LoadDoc drop whose middle half of runs stays below zero (met on medium, not on large), or
- close PKT-0111 as partial and fold the rest into the spawned follow-up on the template drawing.

**Lessons for the Atlas** (already in the packet):
- The documenteditor tabs depend on each other: Header & Footer and View put buttons into other tabs' panels.
- Most of the Toolbar's time before LoadDoc goes to drawing the panel HTML, not to the tab controllers.
- Timings must be compared in paired, alternating runs, never with another browser job running.

On the method itself: rejection notes written for the planner reach the executor, who can't change the Goal. There's no way to send a packet back for a Goal restatement without using up an attempt, and I recorded that in the friction line.
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
differential: new      2efc363a (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/4256e47004ec48bca5359367dcfa48ab4b7bea28-da39a3ee5e6b)
timing web-apps-documenteditor text.docx | original open=3396 join=3259 edit=3399 save=345 convert=344 reopen=3339 | new open=3445 join=3409 edit=3271 save=338 convert=282 reopen=3461
same text.docx dialogs
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx ui
same text.docx reopened
same text.docx converted
timing web-apps-documenteditor styles.docx | original open=3237 join=3120 edit=3345 save=253 convert=376 reopen=3114 | new open=3043 join=3207 edit=3257 save=351 convert=362 reopen=2962
same styles.docx dialogs
same styles.docx model
same styles.docx sentA
same styles.docx sentB
same styles.docx shown
same styles.docx ui
same styles.docx reopened
same styles.docx converted
timing web-apps-documenteditor plain.txt | original open=3240 join=2548 edit=3163 save=265 convert=208 reopen=2545 | new open=3183 join=2807 edit=3386 save=448 convert=228 reopen=2927
same plain.txt dialogs
same plain.txt model
same plain.txt sentA
same plain.txt sentB
same plain.txt shown
same plain.txt ui
same plain.txt reopened
same plain.txt converted
timing web-apps-documenteditor simple.rtf | original open=2953 join=2875 edit=3296 save=218 convert=339 reopen=2792 | new open=3522 join=3281 edit=3317 save=265 convert=273 reopen=2983
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
