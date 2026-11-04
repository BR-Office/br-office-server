You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0109, described in .theseus/queue/ (search for PKT-0109). The changes to review are `git diff 095ea03898c2387cb0a5233bbfb058ccaef005f2..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I re-ran the check that failed on the last attempt, and it now passes; I changed no code for this retry.

**What happened:** the rejection was `differential/sdkjs-word.sh` reporting 1 unintended difference. My work can't be the cause: the `external/sdkjs` checkout is unchanged (still at 0f61ccc, the same build the earlier runs compared against). I ran the check twice and it passed both times (2 cases, every check identical). All six acceptance commands pass now, including 42/42 sdkjs-word and 7/7 sdkjs-common suites. `theseus validate` reports 0 errors and `theseus scope-check` is clean.

**Why it failed before:** probably a flaky timing-sensitive check, or load from another run at the same moment. I can't confirm that: the rejection kept only the summary line, so I don't know which case or check differed.

**What I did:**
- Added a retry entry to the Executor log explaining the above.
- Appended my friction line to `.theseus/scoreboard/friction.jsonl`.
- Committed both as `e4279ef`.

The measurement work from the first attempt is unchanged: `word-repaint.js`, the table in `baseline.md`, and the two follow-up requests. The first skips the all-pages lock redraw in `Send_Changes`; the second traces why some remote changes fall back to recalculating the whole document.

**Lesson for the method:** the differential oracle should keep the name of the check that differed when it fails, and re-run differing checks once before failing a packet, so a flake can be told apart from a real regression.
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
timing sdkjs-common shapes.pptx | original open=3386 join=3007 edit=2022 save=140 convert=162 reopen=3175 | new open=3250 join=3080 edit=2059 save=155 convert=189 reopen=3012
same shapes.pptx model
same shapes.pptx sentA
same shapes.pptx sentB
same shapes.pptx shown
same shapes.pptx reopened
same shapes.pptx converted
timing sdkjs-common chart.pptx | original open=2967 join=3249 edit=1911 save=212 convert=211 reopen=3099 | new open=3146 join=3189 edit=1858 save=251 convert=241 reopen=2829
same chart.pptx model
same chart.pptx sentA
same chart.pptx sentB
same chart.pptx shown
same chart.pptx reopened
same chart.pptx converted
timing sdkjs-common text.docx | original open=3519 join=3797 edit=2922 save=228 convert=232 reopen=3760 | new open=3306 join=3304 edit=2886 save=219 convert=217 reopen=3132
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx reopened
same text.docx converted
differential sdkjs-common: PASS (3 cases)
</differential>
For a performance goal, reject when the measured difference against the original is absent or zero: a change that is correct but does not make what users do faster or safer does not meet the goal. A difference smaller than the spread between repeated runs of identical code is not a gain.

Part of this packet changes another repository, checked out (and git-excluded) in this worktree; review those changes too:
- `git -C external/sdkjs diff refs/theseus/base..HEAD` (branch pkt/PKT-0109 of the fork https://github.com/BR-Office/br-office-sdkjs)
