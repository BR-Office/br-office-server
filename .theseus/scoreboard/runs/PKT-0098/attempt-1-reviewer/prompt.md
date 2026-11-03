You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0098, described in .theseus/queue/ (search for PKT-0098). The changes to review are `git diff 42668f71832245a64d6278c8a32cd2322f0073eb..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've documented how a packet worktree gets `external/sdkjs.base`, and the acceptance oracle `bash .theseus/oracle/differential/sdkjs-common.sh` now passes (3 of 3 cases the same). The work is committed as `496443f`, and `theseus validate` reports 0 errors and 2 warnings.

**What I did**
- `external/sdkjs.base` was missing in this worktree too. I created it with `git clone --depth 1 -b main "file://$(git -C external/sdkjs remote get-url origin)" external/sdkjs.base`, which checked out `9cea536`, the same commit PKT-0097 used. Git already ignores it through the main repository's `.git/info/exclude`, so the contract still holds: it is not committed.
- I added a subsection to `.theseus/adapter/environment.md` with that recipe. It also says why `git clone --shared` of `external/sdkjs` doesn't work: that clone is shallow and has no `main`. It repeats that `external/sdkjs.base` must never be committed.
- I recorded a request for the factory to set up `external/sdkjs.base` automatically in new worktrees: `.theseus/spawn/PKT-0098-factory-provisions-external-sdkjs-base-in-packet.md`. If the factory's setup code isn't in this repository, the request suggests a fallback: `sdkjs-common.sh` clones it on first run, as `sdkjs-word.sh` already does for the forms addon.
- I filled in the Executor log, the Lessons for the Atlas and the friction line.

**Decision:** making it automatic means changing the factory's worktree setup, which is outside this packet's single target file, so I asked for it as a new packet instead of doing it here.

**Lesson for the Atlas:** the differential oracle depends on `external/sdkjs.base`. Until the factory sets it up, every packet that runs this oracle needs the manual clone in `environment.md`.
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
differential: new      88df302 (/home/claude/euro-office-server.theseus-worktrees/.external/cache/sdkjs-differential/out/0cad68eab45f12caf961777e947f0316bf97ba4a-da39a3ee5e6b)
differential: /home/claude/euro-office-server.theseus-worktrees/.external/cache/sdkjs-differential/out/ce3476f599450dca016c61cc5d6d8268c2ea3e09-da39a3ee5e6b/word/unminified: word:all (unminified, memory)
differential: /home/claude/euro-office-server.theseus-worktrees/.external/cache/sdkjs-differential/out/0cad68eab45f12caf961777e947f0316bf97ba4a-da39a3ee5e6b/word/unminified: word:all (unminified, memory)
timing sdkjs-common shapes.pptx | original open=4128 join=3793 edit=2414 save=177 convert=224 reopen=3379 | new open=3424 join=3775 edit=2171 save=214 convert=172 reopen=4025
same shapes.pptx model
same shapes.pptx sentA
same shapes.pptx sentB
same shapes.pptx shown
same shapes.pptx reopened
same shapes.pptx converted
timing sdkjs-common chart.pptx | original open=3730 join=4154 edit=2176 save=204 convert=224 reopen=4354 | new open=4492 join=5161 edit=2442 save=209 convert=269 reopen=3790
same chart.pptx model
same chart.pptx sentA
same chart.pptx sentB
same chart.pptx shown
same chart.pptx reopened
same chart.pptx converted
timing sdkjs-common text.docx | original open=4316 join=4525 edit=3404 save=291 convert=296 reopen=4459 | new open=4460 join=5053 edit=3417 save=422 convert=317 reopen=4540
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx reopened
same text.docx converted
differential sdkjs-common: PASS (3 cases)
</differential>
For a performance goal, reject when the measured difference against the original is absent or zero: a change that is correct but does not make what users do faster or safer does not meet the goal.
