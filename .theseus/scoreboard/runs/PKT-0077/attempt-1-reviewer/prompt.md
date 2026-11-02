You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0077, described in .theseus/queue/ (search for PKT-0077). The changes to review are `git diff f67e4f4ffb2a9e1d13fdc1993add3da2e2d77142..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've ported the shapeFragment cache into the sdkjs source, built it, regenerated the V8 snapshot and re-measured. It cuts x2t CPU time by 14–24 % on large xlsx → pdf, and every page of the output is pixel-identical (2 605 of 2 605). All three acceptance commands pass, `theseus validate` reports no errors, and the work is committed as `a006004`.

**What I did**
- **Source patch:** the change is in `cell/view/StringRender.js` (sdkjs `9cea536`, +34/−1). It is saved as `.theseus/diagnosis/PKT-0077-sdkjs-shape-cache.patch` and can be applied to sdkjs with `git apply`. It uses the same cache key and replay logic as the PKT-0069 prototype. The original function body is renamed `private_shapeFragment`, and recording happens in `private_HandleItem`.
- **Build:** I built the cell bundle with webpack twice from the same checkout, once clean and once patched. That way the only difference between the two sides is the patch; the installed 9.3.7 file comes from a different build.
- **Snapshot:** the new script `.theseus/oracle/perf/sdkjs-mirror.sh` creates a mirror install for each side and runs `x2t -create-js-snapshots` there, so each gets a fresh `sdk-all.bin`. The installed files were not changed; I checked their modification times.
- **Measurement:** the new script `.theseus/oracle/perf/x2t-cpu-ab.py` alternates baseline and patched runs. Medians of 2 runs each:

  | Sample | Baseline | Patched | Saving |
  |---|---|---|---|
  | 1 sheet, 25k rows | 17.8 s | 14.9 s | 16 % |
  | 1 sheet, 50k rows, numbers only | 36.6 s | 31.5 s | 14 % |
  | 1 sheet, 50k rows | 35.5 s | 26.8 s | 24 % |

  PKT-0069's 26 % for the numbers-only file did not reproduce. Baseline runs vary by about ±2 s on this VM, so expect roughly 15–25 %.
- **Results note:** written to the new `.theseus/diagnosis/PKT-0077-shape-cache-source.md`. I left `PKT-0069-shape-cache.md` alone because it is not in this packet's target files.

**Risk, and the follow-up I requested**
The cache key doesn't record whether the font file has loaded yet. That doesn't matter in x2t, where all fonts are local and the process is short-lived. In the browser editor, though, fonts load lazily, so text shaped with a fallback font could keep being drawn with the fallback after the real font arrives. I recorded a request in `.theseus/spawn/` to clear the cache when fonts finish loading (or limit it to x2t) and to prepare the upstream PR. I did not open the PR myself, since that is a public action.

**Not done**
- I did not run the sdkjs unit tests (QUnit, which run in a browser) against the patched build. The page-by-page comparison was the only regression check.
- I did not measure how often the cache hits.

**Lessons for the Atlas**
- On this shared 7 GB VM the webpack build needs `NODE_OPTIONS=--max-old-space-size=2500`. The previous attempt was killed for running out of memory without it.
- For x2t performance comparisons: build both sides from one checkout, give each its own mirror and snapshot, and alternate the runs.
- Any memo cache in sdkjs text shaping has to handle fonts loading lazily in the browser.

The executor log, the lessons section and the friction line are filled in.
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
