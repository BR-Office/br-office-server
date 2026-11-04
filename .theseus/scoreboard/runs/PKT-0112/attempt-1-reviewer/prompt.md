You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0112, described in .theseus/queue/ (search for PKT-0112). The changes to review are `git diff 49728f5f4f4f5bc46f163e8c7aefc54a82a8b680..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
The Comments.js change is back in place and both acceptance commands pass. But the speed-up the plan requires still isn't there, so this attempt doesn't fix what the reviewer rejected.

**What I did**
- The previous attempt's Comments.js change wasn't in `external/web-apps` anymore. I recovered it from the leftover commit on `fork/pkt/PKT-0112` and committed it on the branch, unchanged. In the document editor only, building the Comments panel waits until something first uses it, or until `app:ready`. Comment callbacks from the sdk that arrive during load still get applied, and the other editors are untouched.
- I re-ran the before/after timing the reviewer asked for, with alternating base and new builds: 12 and 16 rounds on `styles.docx` and `big-300p.docx`. I compared the two builds round by round.
- Both acceptance commands pass: `documenteditor-open.sh` and the differential check (4 cases). `theseus scope-check` and `theseus validate` report no errors.

**Result: no measurable gain**
- **Time to load start:** about 25 ms faster at the median over 56 rounds. That's well inside the noise: the spread runs from about 130 ms faster to 56 ms slower.
- **Time to editor ready:** unchanged.
- Each run showed about 100 ms gained on one file and nothing on the other, and the file switched between runs, so it's noise.
- The VM was not idle, which the reviewer had asked for. The PKT-0126 session was running its own browser at the same time, with a load average of 4–5 on 2 CPUs.

**Why there's no gain**
- I added a temporary trace to see what triggers the deferred build. The Toolbar reads the Comments "add" button when the document finishes loading, at `app:ready` (`Toolbar.js` ≈ line 4076). That forces the whole panel to build right there.
- So the work only moves later in the load; it isn't taken out of it. The remaining fix is in `Toolbar.js`, which is outside this packet's target.

**Decisions**
- I stopped changing Comments.js and kept the change: it behaves the same as before, and the follow-up depends on it.
- I recorded a request in `.theseus/spawn/` to make the Toolbar pick up the button only once the panel is actually built, with its own acceptance commands, a before/after measurement on an idle VM and `requires: [documentserver, browser]`.
- I wrote everything down as is. The baseline.md section says the gain doesn't beat the noise and names the load. The log says plainly that the plan's rule is still not met, so the reviewer decides.

**Files**
- `baseline.md`: new PKT-0112 section with the numbers and the cause.
- `open-window-build-2026-11-03b.json` and `-03c.json`: the raw timings.
- The Executor log and Lessons sections of the packet, and the friction line in `friction.jsonl`.

**Lessons for the Atlas**
- A deferred view only leaves the load path if nothing touches it at `app:ready`. A stack trace in the code that runs the deferred build shows what triggers it.
- A before/after timing on this shared 2-CPU VM needs round-by-round comparisons over 30 or more rounds. With fewer, a ±100 ms "gain" jumps from one file to the other between runs.
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
differential: built web-apps documenteditor in 13 s
differential: original d238e526 (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/dd7510be8ba281bc543b18b0f6b3bb63f7ca968b-da39a3ee5e6b)
differential: new      f1da4f89 (/home/claude/euro-office-server.theseus-worktrees/.external/cache/web-apps-differential/out/628416b8e4c2377990d00e202ed0759a6902d671-da39a3ee5e6b)
timing web-apps-documenteditor text.docx | original open=3069 join=3170 edit=3470 save=277 convert=227 reopen=3019 | new open=3262 join=3011 edit=3242 save=252 convert=186 reopen=2978
same text.docx dialogs
same text.docx model
same text.docx sentA
same text.docx sentB
same text.docx shown
same text.docx ui
same text.docx reopened
same text.docx converted
timing web-apps-documenteditor styles.docx | original open=3165 join=3422 edit=3287 save=345 convert=243 reopen=2986 | new open=3170 join=3228 edit=3076 save=289 convert=216 reopen=2822
same styles.docx dialogs
same styles.docx model
same styles.docx sentA
same styles.docx sentB
same styles.docx shown
same styles.docx ui
same styles.docx reopened
same styles.docx converted
timing web-apps-documenteditor plain.txt | original open=3077 join=2374 edit=3084 save=172 convert=124 reopen=2461 | new open=2983 join=2685 edit=3193 save=189 convert=169 reopen=2337
same plain.txt dialogs
same plain.txt model
same plain.txt sentA
same plain.txt sentB
same plain.txt shown
same plain.txt ui
same plain.txt reopened
same plain.txt converted
timing web-apps-documenteditor simple.rtf | original open=2707 join=2669 edit=3179 save=211 convert=128 reopen=2443 | new open=3026 join=2688 edit=3209 save=190 convert=172 reopen=2450
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
For a performance goal, reject when the measured difference against the original is absent or zero: a change that is correct but does not make what users do faster or safer does not meet the goal. A difference smaller than the spread between repeated runs of identical code is not a gain.

Part of this packet changes another repository, checked out (and git-excluded) in this worktree; review those changes too:
- `git -C external/web-apps diff refs/theseus/base..HEAD` (branch pkt/PKT-0112 of the fork https://github.com/BR-Office/br-office-web-apps)
