You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0078, described in .theseus/queue/ (search for PKT-0078). The changes to review are `git diff 0eef442cfba0a35f3f026633a88eca691722af20..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I ran the before/after timing on deck-50.pptx. The style-cache key path got much faster, but the deck as a whole did not open faster in these runs. Acceptance passed (6/6 suites); `theseus validate` shows 0 errors and 1 warning. Everything is committed as 490294a.

**How I measured:** I used the native Document Server and the CDP profiler. I applied the same `getKey` change to the installed `sdkjs/slide/sdk-all.js`, measured, then put the original file back (`cmp` confirms it is byte-identical). The standard `drawings-functions.js` only counts the drawings code, so it can't see `StyleCache.getKey`, which lives in `word/`. I also ran a scratch copy that counts it, 5 runs each way.

| deck-50.pptx, median ms (inclusive) | before | after |
|---|---|---|
| `StyleCache.getKey`, including building the new string key | 111.2 | **23.5** |
| `CMemory.sha256` | 92.9 | gone |
| `StyleCache.add` / `remove` | 76.3 / 27.6 | 23.2 / ~0 |
| `CShape.recalculateTextStyles` | 124.8 | 175.5 |
| Total busy time during open (median of 5) | 2063 | 2327 |

- **Cost of the new string keys:** building them takes about 23.5 ms, against 111 ms with sha256, so about 88 ms saved in that path.
- **Not resolved:** `recalculateTextStyles` and total open time did not go down. Runs on this 2-CPU VM vary a lot (busy time 1724–2965 ms), so it may be noise. It may also be that long string keys move cost somewhere else, such as hashing or garbage collection. I recorded this in the log; I did not cover it up.

**Commit fe036d5 for review:** the outer repo doesn't track `external/sdkjs`, and the packet doesn't allow new files. So I pasted the full `git format-patch` of fe036d5 into the packet's Executor log; it applies with `git -C external/sdkjs am`. It is also still on branch `pkt/PKT-0078` of the nested clone. I did not push it to the shared mirror.

**Decisions:** the key is the exact serialized bytes, so it can't collide. As in the earlier attempts, I did not add a per-hierarchy cache in Shape.js: its output also depends on autofit and the fill reference, so I couldn't invalidate it safely within this packet. I added no follow-up packets. The friction line is appended.

**Lessons for the Atlas:**
- The drawings-by-function profile hides style-cache costs because that code is in `word/`. A key or hashing change needs the wider count.
- To compare before and after, patch the installed bundle in place with an exact-match replacement and restore it, the way `sdkjs-shape-cache.py` does. A sanctioned script for this is still missing.
- On this VM, total open time is too noisy to show a gain of about 90 ms. Per-function inclusive times are the reliable signal.
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
