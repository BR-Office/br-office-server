You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0082, described in .theseus/queue/ (search for PKT-0082). The changes to review are `git diff 0b3d2dbcb4d7dcd7211628e6b275132afee8a197..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I made the sdkjs shapeFragment cache safe for the browser editor, re-measured it and wrote the PR text. Both acceptance commands pass: the patch file exists and the healthcheck returns `true`. `theseus validate` reports no errors and one warning. Everything is committed as `3dcb6f2`.

**What changed in the patch** (`.theseus/diagnosis/PKT-0077-sdkjs-shape-cache.patch`, updated in place; it now touches 2 files, +47/−1):
- **Native engine only:** the cache is used only when `window["NATIVE_EDITOR_ENJINE"] === true`, which is how x2t runs. There all fonts are local and load synchronously, so a fallback shaping can't be cached before the real font arrives. In the browser, the code runs exactly as before.
- **Cleared on font load:** a new `AscCommonExcel.clearShapeCache()` is called in `cell/api.js` whenever document fonts or a single font finish loading. It does nothing in the browser today because of the gate, but it would let a later PR turn the cache on there.

**Re-measure** (same checkout built twice, each side with its own V8 snapshot, 2 interleaved runs per side):

| Sample | base CPU (s) | patched CPU (s) | saving |
|---|---|---|---|
| 1 sheet, 25k rows | 16.8 | 14.6 | 13 % |
| 1 sheet, 50k rows, numbers only | 35.6 | 29.8 | 16 % |
| 1 sheet, 50k rows | 33.7 | 25.9 | 23 % |

That is the same range PKT-0077 found, so the gate does switch the cache on in x2t. All 2,605 rendered pages are byte-identical between the two builds and the PDF sizes match. The installed `sdk-all.js` was not modified.

The numbers, method and PR title/body are in `.theseus/diagnosis/PKT-0082-sdkjs-shape-cache-pr.md`; opening the PR is left to a human.

**Not done:**
- The sdkjs QUnit suites were not run.
- The browser path was not exercised; it is unchanged by construction.

**Surprises** (recorded in the Executor log and friction line):
- The pinned sdkjs commit `9cea536` is no longer in the shallow mirror. The patch applies cleanly on the current main, `d9e810c`, which I used.
- `external/` was missing from this worktree, so I cloned the local sdkjs mirror into the scratchpad.
- The cell webpack build was killed for running out of memory twice with a 2500 MB heap while other agents were running. It worked at 3000 MB.

**Lessons for the Atlas:**
- x2t runs sdkjs with `NATIVE_EDITOR_ENJINE === true`, which makes it the right switch for optimizations that should only apply to native conversion.
- On this shared VM the sdkjs cell build needs about 3000 MB of heap.
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
