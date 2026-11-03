You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0097, described in .theseus/queue/ (search for PKT-0097). The changes to review are `git diff a358177c0667205fb18de91e4790db03622fb072..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I fixed the one thing the rejection asked for: the follow-up now exists as a spawn request and is listed in the packet. The acceptance oracle passes (3 cases) and `theseus validate` reports 0 errors and 2 warnings, which I didn't look into.

**What I changed**
- **`build.sh`:** unchanged from attempt 1. The untracked-file hash runs from the sdkjs checkout directory (`(cd "$SRC" && xargs -0r sha1sum)`), the same way the copy step already does.
- **New follow-up request:** `.theseus/spawn/PKT-0097-provision-external-sdkjs-base-in-packet-worktree.md`, made with `theseus packet new`. Its target is `.theseus/adapter/environment.md`; it requires `documentserver` and `browser`, and its acceptance command is the same oracle. Its context records the clone command that worked here and that a `--shared` clone of `external/sdkjs` did not.
- **Packet file:** the request is listed under "Spawned packets", and the Executor log has a note on attempt 2.
- **Friction:** I added a second line for PKT-0097 to `.theseus/scoreboard/friction.jsonl`, about having to retry because the follow-up was only in the log.
- **Commit:** `5d12bcc`.

**Decisions**
- I typed the follow-up as `refactor`, because the command rejects `chore` and offers no type for environment or docs work.
- I left `external/sdkjs.base` uncommitted. The clone I made in attempt 1 is git-ignored, and the new request's contract says it must never be committed.

**Lessons for the Atlas**
- The differential oracle needs `external/sdkjs.base`, a checkout of upstream main from the sdkjs mirror. It isn't always set up in packet worktrees, which the new request covers.
- A follow-up mentioned only in the Executor log is not enough: it needs a `theseus packet new` request plus an entry under "Spawned packets".
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
timing sdkjs-common shapes.pptx | original open=4039 join=3981 edit=2512 save=194 convert=182 reopen=3789 | new open=3927 join=4222 edit=2247 save=201 convert=240 reopen=3605
same shapes.pptx model
same shapes.pptx sentA
same shapes.pptx sentB
same shapes.pptx shown
same shapes.pptx reopened
same shapes.pptx converted
timing sdkjs-common chart.pptx | original open=4056 join=3912 edit=2011 save=192 convert=227 reopen=3862 | new open=3681 join=4150 edit=2307 save=233 convert=193 reopen=3457
same chart.pptx model
same chart.pptx sentA
same chart.pptx sentB
same chart.pptx shown
same chart.pptx reopened
same chart.pptx converted
timing sdkjs-common text.docx | original open=4209 join=4471 edit=3291 save=332 convert=233 reopen=4401 | new open=4910 join=4690 edit=3065 save=292 convert=286 reopen=5021
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx reopened
same text.docx converted
differential sdkjs-common: PASS (3 cases)
</differential>
For a performance goal, reject when the measured difference against the original is absent or zero: a change that is correct but does not make what users do faster or safer does not meet the goal.
