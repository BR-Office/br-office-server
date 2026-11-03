You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0104, described in .theseus/queue/ (search for PKT-0104). The changes to review are `git diff 9c243f26891d2afc7e021e6d5d8f2b55d3b7dc9b..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've written the round-2 diagnosis for sdkjs-word and committed it. The verdict is still **refactor**, in JavaScript, with confidence raised from low to medium because we now know where the time goes. All nine acceptance commands pass, and `theseus scope-check` is clean.

**What I measured** (written to `.theseus/oracle/rounds/sdkjs-word-r2.md`):
- **Test suites:** all pass on the new build. Word is 42/42 suites, now including the forms suite; common is 7/7.
- **Differential checks (original vs new):** both pass. The word one has 2 cases and the common one has 3, and every compared output is the same. So the round-1 changes don't change behaviour.
- **Speed as users feel it** (`client-perf.js`): typing p50/p90 46/115 ms, and applying another user's change p50/p90 147/463 ms. The script measures the installed package, which still runs the original code, so these numbers don't include the round-1 gain.

**What round 1 delivered:** one real gain. PKT-0091 made font collection incremental for remote changes, which cut the receiving editor's busy time by about 7% on a 100-page document (PKT-0093). PKT-0066 and PKT-0087 were correct but gained nothing, so I count them as not delivered. PKT-0087 had fixed a change type that remote typing never sends. Open time, typing latency, and the redraw and recalculation on remote changes are untouched.

**Decisions:**
- **Where to look next:** the remaining time in typing and remote apply is mostly redrawing (33–57% of the time is spent in drawing code). The font fix has given all it can.
- **Plan for wave 0 of round 2:**
  - **P1** measures how much gets redrawn per keystroke and per remote change, and finds the code that decides that.
  - **P2** adds a 100-page remote-typing case to the differential check, so a redraw fix can be proven both correct and faster.
- **Wave 1 refactors** will be planned from P1's results, not guessed now.
- **No language change:** the profiling found no single piece of code above 4% of the time, so nothing is worth moving to another language.

**What I couldn't do or ran into:**
- The differential check's timings are noise, varying by 2–3 s between runs, and its small inputs never exercise remote apply. It can't show speed gains, which is why P2 exists.
- No perf script runs the new build; that is why the 7% figure comes from PKT-0093's separate A/B test rather than from today's run.
- `/usr/bin/time` isn't installed on the VM, so my first oracle loop produced nothing and I timed the scripts with `date` instead.
- `DIAG-sdkjs-word-b.md` didn't exist, so there was nothing to remove.

**Lessons for the Atlas:**
- Before writing a fix, check on a live trace which change types and calls actually happen.
- Measure the most a fix could gain before building it.
- Gains measured on the fork build only reach users once that build ships.

The decisions and surprises are in the packet's Executor log, and my friction line is in `friction.jsonl`.
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
differential: original 9cea536 (/home/claude/euro-office-server.theseus-worktrees/.external/cache/sdkjs-differential/out/ce3476f599450dca016c61cc5d6d8268c2ea3e09-da39a3ee5e6b)
differential: new      0f61ccc (/home/claude/euro-office-server.theseus-worktrees/.external/cache/sdkjs-differential/out/02ce87d738a07167925e80b09f9f3e8c2616525a-da39a3ee5e6b)
differential: /home/claude/euro-office-server.theseus-worktrees/.external/cache/sdkjs-differential/out/ce3476f599450dca016c61cc5d6d8268c2ea3e09-da39a3ee5e6b/word/unminified: word:all (unminified, memory)
timing sdkjs-common shapes.pptx | original open=4300 join=4216 edit=2424 save=190 convert=184 reopen=4231 | new open=3912 join=4383 edit=2380 save=236 convert=206 reopen=3527
same shapes.pptx model
same shapes.pptx sentA
same shapes.pptx sentB
same shapes.pptx shown
same shapes.pptx reopened
same shapes.pptx converted
timing sdkjs-common chart.pptx | original open=3995 join=3768 edit=2144 save=242 convert=232 reopen=3854 | new open=3955 join=4048 edit=2256 save=205 convert=295 reopen=4059
same chart.pptx model
same chart.pptx sentA
same chart.pptx sentB
same chart.pptx shown
same chart.pptx reopened
same chart.pptx converted
timing sdkjs-common text.docx | original open=4496 join=4482 edit=3400 save=310 convert=291 reopen=4498 | new open=4065 join=4437 edit=3136 save=324 convert=241 reopen=3732
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx reopened
same text.docx converted
differential sdkjs-common: PASS (3 cases)
</differential>
For a performance goal, reject when the measured difference against the original is absent or zero: a change that is correct but does not make what users do faster or safer does not meet the goal.

Part of this packet changes another repository, checked out (and git-excluded) in this worktree; review those changes too:
- `git -C external/sdkjs diff refs/theseus/base..HEAD` (branch pkt/PKT-0104 of the fork https://github.com/BR-Office/br-office-sdkjs)
