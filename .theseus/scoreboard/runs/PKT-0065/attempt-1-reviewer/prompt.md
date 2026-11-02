You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0065, described in .theseus/queue/ (search for PKT-0065). The changes to review are `git diff 38ed98ecc7027fb8af0476b6ad4deb61bdc3ae8e..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I measured a real speedup for small PDF exports and recorded it, but it's about 0.1 s per export, well below the plan's 0.3–0.6 s estimate. Both acceptance commands pass (`.theseus/oracle/unit.sh`: 178 passed, 1 skipped; `npm run lint:check`: exit 0 with one warning), and the work is committed on this branch.

**What the change is.** `external/core` is still read-only, so I didn't write a code patch. It turned out none is needed for this cut: the installed x2t already loads V8 startup snapshots (pre-built copies of the editors' JavaScript engine state) from `sdkjs/<editor>/sdk-all.bin`, and `x2t -create-js-snapshots` creates them. The 9.3.7-1 package doesn't ship these files. The copies on this VM were left by an earlier attempt at this packet.

**Proof of speed.** I ran `convert-large.js` 5 times per file on the three empty test documents, once with the snapshot files and once with them moved aside (restored afterwards). Median times for conversion to PDF through the server:

| File | Without snapshots | With snapshots | Change |
|---|---|---|---|
| new.docx | 719 ms | 631 ms | −88 ms (−12%) |
| new.xlsx | 722 ms | 621 ms | −101 ms (−14%) |
| new.pptx | 1015 ms | 909 ms | −106 ms (−10%) |

Conversions that don't run the JavaScript engine were unchanged. Each setting was measured once, so treat about ±30 ms as noise.

**Proof of equality.** P2's corpus oracle (`corpus.py`), run with the snapshots in place, gives `equal` against `baseline-9.3.7-1.json`.

**Decisions:**
- The fix belongs in installation, not in x2t: every install and upgrade should create the snapshot files, owned by user `ds`, and rebuild them when x2t or the scripts change. I didn't make that change, because it lives outside this packet's target. I requested it as a follow-up in `.theseus/spawn/PKT-0065-ship-v8-js-startup-snapshots-*.md`, which needs `documentserver`.
- I set aside the other two candidates. Skipping `CDocBuilder::Initialize` would save too little: process start plus engine setup is only about 60 ms. Keeping a converter running between jobs is the only way to remove the rest of the fixed cost, but it needs a fork of `core` and its own diagnosis. I haven't requested it yet.
- I dropped the earlier attempt's patch, whose hunk header the review flagged as wrong, because it isn't needed.

**Surprises:**
- The unit oracle failed once in `docsCoServerCrashPaths` (handshake auth tests), then passed three full runs in a row. It's flaky and probably caused attempt 2's acceptance failure. That file is outside the target, so I left it alone.
- The repository had no record that an earlier attempt had created files on the VM.

**Lessons for the Atlas** (also written in the packet):
- x2t uses `sdk-all.bin` snapshots when they're present, and the package doesn't ship them.
- For small PDF exports, the remaining fixed cost (about 0.3–0.6 s) is the JavaScript warming up during the first conversion step, not starting the process or the engine.

The decision note is `.theseus/diagnosis/PKT-0065-x2t-js-snapshots.md`, next to the raw measurements (`PKT-0065-convert-large-*.json`). The Executor log and my friction line are filled in.
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
