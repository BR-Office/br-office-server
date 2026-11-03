You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0071, described in .theseus/queue/ (search for PKT-0071). The changes to review are `git diff 1a6bcd963ec27d5c848283f2ae43a6f10329c79f..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0071 is finished and committed. The main result: **PKT-0066 brings no gain as delivered, because its incremental path never runs during remote typing.** `bash .theseus/oracle/unit.sh` passes and `theseus validate` reports no errors (one warning).

**How I measured**
- The commit named in the packet, d46dde8, no longer exists. I fetched `fork/pkt/PKT-0066` instead (b152f87), which changes the same 4 files.
- I built two word bundles the same way with `npm run build:word`: "before" from `main` and "after" with the PKT-0066 files. The sdkjs tree is clean again afterwards; no sdkjs code was changed or committed.
- Playwright loaded each bundle into the editor in place of the installed one, so the server stayed untouched.
- I profiled user B on the 100-page docx while user A sent 30 typed markers (the typical case) and 10 changes to the default paragraph style (the expected fallback case). Each variant got 3 runs.
- `profile-word.js` and `attribute-word.js` can't swap the bundle and are outside the target, so I used the same method in a scratch harness. It isn't committed because the packet allows no new files; the recipe is in `baseline.md`.

**Results (means of 3 runs)**

| Case | Variant | B busy ms | Font-name collection ms (inclusive) | `ParaRun.Get_AllFontNames` self ms |
|---|---|---|---|---|
| Typing, 30 changes | before | 2 360 | 140 | 86 |
| Typing, 30 changes | after | 2 842 | 195 | 132 |
| Style, 10 changes | before | 5 491 | 37 | 24 |
| Style, 10 changes | after | 7 185 | 68 | 47 |

The "after" numbers look worse, but that is run-to-run noise: the new code itself takes 0.1 ms, and one slow style run doubles that mean. `baseline.md` also has `Paragraph.Document_Get_AllFontNames` and `CTextPr.Document_Get_AllFontNames` self times.

**Why it falls back:** I instrumented B and found that every incoming typing batch contains two changes: the edited run, plus a `CTableId` change that registers the new run. `GetFontNamesFromClasses` doesn't recognise `CTableId`, so it gives up and the full walk runs. That happened for all 30 batches.

**The possible gain is small anyway:** collecting font names costs about 4.7 ms per remote change, roughly 6 % of B's busy time. Repainting and recalculation remain the main cost. On style edits it is under 1 %, since each one recalculates the whole document (about 0.5 s).

**Follow-up:** I recorded a packet request in `.theseus/spawn/` to make the incremental path handle `CTableId` changes, then re-measure with this recipe.

**Lessons for the Atlas** (also in the packet's Executor log, with the friction line appended):
- Remote typing batches in the word editor always include a `CTableId` change. Any optimisation that decides per changed object must handle it, or it silently falls back to the full walk.
- To compare an sdkjs change before and after without touching the server, build both bundles and load them through Playwright routing.
- Packets should name a branch rather than a commit hash, since hashes can disappear after a rebase.
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
- `git -C external/sdkjs diff refs/theseus/base..HEAD` (branch pkt/PKT-0071 of the fork https://github.com/BR-Office/br-office-sdkjs)
