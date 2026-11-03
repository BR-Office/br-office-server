You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0084, described in .theseus/queue/ (search for PKT-0084). The changes to review are `git diff 8f91dbc608a5a2f016d4c86da9195d1772654222..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've landed the PKT-0080 lookup-table change for `hb_get_script_horizontal_direction` on the sdkjs branch pkt/PKT-0084, with a unit test and a browser measurement. All four acceptance commands pass.

**What changed**
- **The change:** in `common/libfont/common.js` the old switch stays as a reference function. At load it fills a `Map` with the scripts that are not left-to-right, and the main function takes a shortcut for Latin and Common text. It is committed in sdkjs as `42c8391`. The patch in the PKT-0080 log no longer applied with `git apply`, so I made the same change by hand.
- **Unit test:** the new `tests/common/libfont/script-direction.{html,js}` checks that the table gives the same direction as the switch for every `HB_SCRIPT` value, plus a few known scripts and values that are not scripts at all (0, -1, null and so on). The sdkjs-common oracle picks it up automatically: 14/14 assertions.
- **Acceptance results:**

  | Command | Result |
  |---|---|
  | `sdkjs-common` | 7/7 suites |
  | `sdkjs-word` | 42/42 suites |
  | `differential/sdkjs-word` | PASS |
  | `differential/sdkjs-common` | PASS |

**Browser measurement**
I opened large-100p.docx three times each in the running Document Server, once with the original sdkjs build and once with this branch's build, and profiled the CPU. The function's own time dropped from about 20–36 ms to about 0–6 ms, which matches PKT-0080's estimate. The total open times also differ, but that comparison isn't fair: the original build is the unminified fallback (minifying ran out of memory) and the new one is minified. Only the per-function number reflects this change.

**Decisions**
- I didn't use `profile-fonts.js`, which exists only on pkt/PKT-0072 and measures the installed bundle. I didn't build a mirror of the install either. Instead, Playwright swapped `/sdkjs/word/sdk-all{,-min}.js` for the two builds the differential oracle had already made.
- That A/B script is not committed, because the packet allows no new files. It is in `/tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0084/e2365500-789f-4585-8b95-7419838f80c8/scratchpad/ab.cjs`, and the method is described in the Executor log.

**Problem found and follow-up requested**
`.theseus/oracle/differential/build.sh` crashes with exit 123 whenever the sdkjs checkout has untracked files: it computes their checksums from the wrong directory. I got around it by committing in sdkjs first. I filed a follow-up request in `.theseus/spawn/PKT-0084-fix-differential-build-sh-hashing-of-untracked-f.md` (requires `documentserver` and `browser`).

The Executor log, Lessons for the Atlas and friction line are written, and `theseus validate` reports no errors. Everything is committed as `6c6a73c`.

**Lessons for the Atlas**
- You can A/B-test an sdkjs change in the browser by routing `sdk-all.js` to builds from the differential oracle, with no mirror of the install. First check that both builds are minified, or that neither is.
- Commit in `external/sdkjs` before running the differential oracles whenever there are new untracked files.
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
differential: new      42c8391 (/home/claude/euro-office-server.theseus-worktrees/.external/cache/sdkjs-differential/out/02ce87d738a07167925e80b09f9f3e8c2616525a-da39a3ee5e6b)
differential: /home/claude/euro-office-server.theseus-worktrees/.external/cache/sdkjs-differential/out/ce3476f599450dca016c61cc5d6d8268c2ea3e09-da39a3ee5e6b/word/unminified: word:all (unminified, memory)
timing sdkjs-common shapes.pptx | original open=4186 join=4023 edit=2133 save=193 convert=188 reopen=3629 | new open=3552 join=3827 edit=2246 save=232 convert=193 reopen=3396
same shapes.pptx model
same shapes.pptx sentA
same shapes.pptx sentB
same shapes.pptx shown
same shapes.pptx reopened
same shapes.pptx converted
timing sdkjs-common chart.pptx | original open=3813 join=3856 edit=2114 save=268 convert=194 reopen=3702 | new open=3938 join=3993 edit=2023 save=267 convert=250 reopen=3580
same chart.pptx model
same chart.pptx sentA
same chart.pptx sentB
same chart.pptx shown
same chart.pptx reopened
same chart.pptx converted
timing sdkjs-common text.docx | original open=4537 join=5069 edit=3229 save=315 convert=239 reopen=4226 | new open=4412 join=4028 edit=3205 save=386 convert=251 reopen=3593
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
- `git -C external/sdkjs diff refs/theseus/base..HEAD` (branch pkt/PKT-0084 of the fork https://github.com/BR-Office/br-office-sdkjs)
