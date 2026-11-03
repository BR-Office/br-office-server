You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0097, described in .theseus/queue/ (search for PKT-0097). The changes to review are `git diff a358177c0667205fb18de91e4790db03622fb072..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I fixed PKT-0097 and the acceptance oracle passes: `bash .theseus/oracle/differential/sdkjs-common.sh` → PASS (3 cases).

**The fix:** in `.theseus/oracle/differential/build.sh`, the hash of untracked files now runs from the checkout folder: `(cd "$SRC" && xargs -0r sha1sum)`. The copy step below it already worked this way.

**Check:** I put a test file into the base checkout and ran the key computation alone. It no longer fails, and the key changes (`…-b919861e8ce4`). With the file removed, the key is the same as before the fix (`…-da39a3ee5e6b`). So a clean checkout still uses the same output folders, as the contract requires.

**Problem found:** `external/sdkjs.base` was missing from this worktree, so the oracle stopped at `build.sh` line 9 before testing anything. I created it myself by cloning `main` of the sdkjs mirror at depth 1, which gives `9cea536`, the same base PKT-0093 used. It is git-ignored and not committed. The factory should set it up in packet worktrees, and `.theseus/adapter/environment.md` should say how; I couldn't change that file because it is outside this packet's target.

**Records:** the Executor log and Atlas lesson are in the packet, the friction line is in `.theseus/scoreboard/friction.jsonl`, and `theseus validate` reports 0 errors (2 warnings, which I didn't look into). Committed as `fix(oracle): hash untracked sdkjs files from the checkout dir in differential/build.sh`.

**Lesson for the Atlas:** the differential oracle needs `external/sdkjs.base` (upstream `main` of the sdkjs mirror), and packet worktrees don't always have it.
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
timing sdkjs-common shapes.pptx | original open=3727 join=4178 edit=2247 save=177 convert=185 reopen=3837 | new open=3472 join=3744 edit=2461 save=231 convert=192 reopen=3784
same shapes.pptx model
same shapes.pptx sentA
same shapes.pptx sentB
same shapes.pptx shown
same shapes.pptx reopened
same shapes.pptx converted
timing sdkjs-common chart.pptx | original open=4050 join=3980 edit=2209 save=221 convert=232 reopen=4245 | new open=3567 join=3751 edit=2085 save=257 convert=252 reopen=3634
same chart.pptx model
same chart.pptx sentA
same chart.pptx sentB
same chart.pptx shown
same chart.pptx reopened
same chart.pptx converted
timing sdkjs-common text.docx | original open=4377 join=4321 edit=3379 save=250 convert=307 reopen=4369 | new open=5426 join=4601 edit=3226 save=348 convert=228 reopen=4121
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx reopened
same text.docx converted
differential sdkjs-common: PASS (3 cases)
</differential>
For a performance goal, reject when the measured difference against the original is absent or zero: a change that is correct but does not make what users do faster or safer does not meet the goal.
