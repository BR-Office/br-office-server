You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0078, described in .theseus/queue/ (search for PKT-0078). The changes to review are `git diff 0eef442cfba0a35f3f026633a88eca691722af20..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
The style-cache part of PKT-0078 is done and measured, but the main goal isn't met: `CShape.recalculateTextStyles` did not drop, and this change cannot lower it.

**Why it didn't drop.** The packet assumed the sha256 hashing ran inside `recalculateTextStyles`, and it doesn't. I wrote a probe that adds up the callers of every style-cache sample. It shows the style cache is called from `ParaRun.Get_CompiledPr` during paragraph recalculation, and `recalculateTextStyles` never appears among those callers. Both were expensive in the same open, but in separate call trees. `recalculateTextStyles` (120–190 ms per open, noisy) spends its time building and copying style objects for each shape, and only a cache in `Shape.js` can reduce it. I didn't add one here: its result depends on autofit, fontRef/smartArt fill and the editor type, so it's not safe to share without more work. I spawned it as a follow-up in `.theseus/spawn/`.

**What changed.** A second sdkjs commit, `2dc4784`, on top of `fe036d5` (branch `pkt/PKT-0078` of `external/sdkjs`). The cache now stores entries in a `Map` and remembers each cached object's key, so removing an entry no longer serializes the style. Keys are still the exact serialized bytes, so resolved styles are unchanged.

**Before/after on deck-50.pptx.** Measured on the native Document Server by patching the installed bundle and restoring it byte-identical afterwards (checked with `cmp`). 9 opens per variant, run interleaved:

| | before (sha256) | after (string key + remembered keys) |
|---|---|---|
| All style-cache work, including the new string keys | 129.6 ms | 24.1 ms (about −105 ms) |
| `CMemory.sha256` | 83–106 ms | 0 |
| Whole open, median busy time | 2212 ms | 2124 ms |

The −88 ms on the whole open is inside the run-to-run spread on this 2-CPU VM (1848–2785 ms), so 9 opens can't show an end-to-end gain.

**Why `StyleCache.remove` fell to ~0.** Its old ~30 ms was almost all sha256. With string keys alone (`fe036d5`), what remained was a few ms, which falls below the top-40 cut in the summary and reads as 0. With `2dc4784` it does no serialization at all, so ~0 is now its real cost.

**Other fixes.** The stale "Not done" line in the Executor log is marked as superseded, and the full log is filled in. Both commits sit only in the nested `external/sdkjs` clone of this worktree. The outer repo doesn't track that clone and no sdkjs fork exists, so I couldn't push them anywhere; the attempt-3 patch is embedded in the packet and the full patch is in `/tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0078/0204548c-a824-57b7-bea3-1783011bc81a/scratchpad/pkt78.patch`.

**Checks.** `bash .theseus/oracle/sdkjs-common.sh`: 6/6 suites pass (two run as known-broken, as recorded). `theseus validate`: 0 errors. Friction line appended; outer commit `66cade5`.

**Lessons for the Atlas:**
- When two hot functions are both expensive in the same open, check the call chain before assuming one calls the other.
- `drawings-functions.js` has no caller view and no before/after mode, which hid this premise error for three attempts.
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
