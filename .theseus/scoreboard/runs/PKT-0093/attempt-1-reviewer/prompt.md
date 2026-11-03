You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0093, described in .theseus/queue/ (search for PKT-0093). The changes to review are `git diff ae3770138784b252d9bf16e42d55da97eda2b419..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0093 is done: PKT-0091's fix works. After the change, every remote-typing batch on user B takes the incremental font path, and the full font scan no longer runs at all while typing.

| Variant | B busy ms | font collection ms | batches on incremental path |
|---|---|---|---|
| before (sdkjs main 9cea536) | 3 737 | 271 | — (136 full scans) |
| PKT-0091 (fork `theseus` 88df302) | 3 459 | 0.5 | **143 / 143**, 0 full scans |

- **Batches:** each batch now carries only the paragraph run (`ParaRun`). The description change that used to force the full scan (`CTableId`) is skipped. There are 143 batches rather than 30 because the save step that collects fonts runs 46–49 times per 30 markers.
- **Gain:** about 270 ms of font collection per 30 changes on the 100-page file, roughly twice the ~140 ms the packet expected. B's busy time drops about 7 %. This VM was busier than in earlier runs (the before figure was 237 ms in PKT-0089 and 140 ms in PKT-0071), so the gain grows with load.

All five acceptance commands pass. `differential/sdkjs-common.sh` failed once with a Playwright timeout, then passed on an unchanged rerun.

**Decisions**
- I compared only two variants. The PKT-0091 build already includes PKT-0087's `TableId_Add` branch, and the before build has neither; PKT-0089 had already measured PKT-0066 and PKT-0087 alone. The baseline section says which builds include what.
- Both bundles are the differential oracle's cached builds rather than new ones.
- The measurement script stays in the scratchpad (`/tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0093/6a3538a6-3d1a-4636-af47-d5b50689be7e/scratchpad/ab.cjs`), because the target only allows `baseline.md`.
- The factory's resume commit in `external/sdkjs` had recorded the forms addon folder (`.theseus-addons/sdkjs-forms`) as a git link. That is outside the scope, so I removed it in a separate commit (261086b).

**Not done:** the profiler did not separate `ParaRun.Get_AllFontNames`, so I report all `*AllFontNames` self time instead. The style case is not measured; it falls back to the full scan by design.

**Lesson for the Atlas:** remote typing sends one description change plus one `ParaRun` per batch. With PKT-0091, almost none of B's font-collection cost is left.

The baseline section, executor log and friction line are committed, and `theseus validate` reports 0 errors.
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
differential: new      261086b (/home/claude/euro-office-server.theseus-worktrees/.external/cache/sdkjs-differential/out/0cad68eab45f12caf961777e947f0316bf97ba4a-da39a3ee5e6b)
differential: /home/claude/euro-office-server.theseus-worktrees/.external/cache/sdkjs-differential/out/ce3476f599450dca016c61cc5d6d8268c2ea3e09-da39a3ee5e6b/word/unminified: word:all (unminified, memory)
differential: /home/claude/euro-office-server.theseus-worktrees/.external/cache/sdkjs-differential/out/0cad68eab45f12caf961777e947f0316bf97ba4a-da39a3ee5e6b/word/unminified: word:all (unminified, memory)
timing sdkjs-common shapes.pptx | original open=3962 join=4009 edit=2518 save=244 convert=308 reopen=3744 | new open=4318 join=4447 edit=2714 save=253 convert=297 reopen=3722
same shapes.pptx model
same shapes.pptx sentA
same shapes.pptx sentB
same shapes.pptx shown
same shapes.pptx reopened
same shapes.pptx converted
timing sdkjs-common chart.pptx | original open=3823 join=4279 edit=2117 save=392 convert=454 reopen=4072 | new open=3899 join=4105 edit=2184 save=498 convert=489 reopen=3760
same chart.pptx model
same chart.pptx sentA
same chart.pptx sentB
same chart.pptx shown
same chart.pptx reopened
same chart.pptx converted
timing sdkjs-common text.docx | original open=4689 join=5102 edit=3235 save=302 convert=337 reopen=4526 | new open=5350 join=4634 edit=3546 save=305 convert=299 reopen=4963
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
- `git -C external/sdkjs diff refs/theseus/base..HEAD` (branch pkt/PKT-0093 of the fork https://github.com/BR-Office/br-office-sdkjs)
