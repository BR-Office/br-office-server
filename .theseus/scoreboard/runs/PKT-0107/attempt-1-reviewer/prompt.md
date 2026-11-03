You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0107, described in .theseus/queue/ (search for PKT-0107). The changes to review are `git diff fc63f6485e177156f3130c3f56638f242325eafc..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0107 is finished: the x2t oracle now passes twice in a row with the same binary on both sides, and none of the 7 "original side itself unstable" differences came back. The work is committed as `5616f18`.

**What changed** (only in `.theseus/oracle/differential/x2t-run.cjs`):
- **Bold toggle:** the scripted edit on text-10p.docx now turns bold on and off with `editor.put_TextPrBold(true/false)` instead of pressing Control+b. The shortcut raced with the typing, so the "b" of "bold" was sometimes lost and the text ended as "Local edit old".
- **Wait before capturing:** I added an `expect` step to `play()`. It keeps checking the document text for up to 10 s, and if the edit never shows up it stops the run with "scripted edit not applied". A lost key now gives a clear error instead of a random unstable side. It checks twice on text-10p.docx: after "bold", and after the second line.

Both changes were already in the worktree from the earlier attempt (it kept its work across the factory restart). This run proved them; I didn't rewrite anything.

**Checks:**
- `bash .theseus/oracle/differential/x2t.sh`: passed twice in a row, each ending with `x2t-browser: PASS (3 cases, 2 repeat(s) per side)` and `differential x2t: PASS`.
- `theseus validate`: 0 errors and 4 warnings. I didn't look at the warnings; none come from a file this packet changed.
- `theseus scope-check`: ok.
- No entries were added to `x2t.intended` and no test assertions changed.

The Executor log and friction line are filled in. One run of `x2t.sh` takes about 5–6 minutes on this VM, so two runs don't fit in one 600 s command; that's the friction line.

**Lesson for the Atlas:** in the oracle, apply formatting through the editor's own functions rather than keyboard shortcuts, and check that the scripted edit is in the document before capturing anything.
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

Part of this packet changes another repository, checked out (and git-excluded) in this worktree; review those changes too:
- `git -C external/core diff refs/theseus/base..HEAD` (branch pkt/PKT-0107 of the fork https://github.com/BR-Office/br-office-core)
