You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0026, described in .theseus/queue/ (search for PKT-0026). The changes to review are `git diff 62bc59db8de6884cdb485fdf19e575020692a776..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've finished PKT-0026 and committed it (`a70ff95`). Common/ is not a performance hotspot: under the 50×5 co-edit load it accounts for about 0.01 of a CPU core, roughly 1% of DocService's time. That supports DIAG-common staying **keep**. The packet has no acceptance commands, so there was nothing to run as proof; `theseus validate` passes with 0 errors.

| Run (stock WARN logging) | DocService cores | Common's own code | Common + what it calls | Common, % of wall time |
|---|---|---|---|---|
| Co-edit, 50 docs × 5 clients | 0.077 | 4.0 % | 14.6 % | 1.1 % |
| ConvertService, 45 conversions | 0.043 | 3.5 % | 25.4 % | 1.1 % |

- **Where Common's time goes:** mostly I/O wrappers in `utils.js`, not the parts the packet named:
  - `fillResponse` (writing the HTTP reply) is 17.5% of DocService CPU during conversions.
  - `postRequestPromise` (save callbacks) is 6.5% during co-edit.
  - Tenant config lookups (`operationContext`) are about 1%, storage-base under 2%, and the RabbitMQ task queue under 1.5%.
- **Per conversion:** about 4.6 ms of Common CPU, against 125–1 000 ms end to end, so under 4% of a conversion's latency.
- **Wall time:** the CPU profile can't attribute wall time per request, so the "% of wall" column is Common's CPU divided by the length of the profiled window.
- **Logging level:** the VM had been left on DEBUG logging since PKT-0018, so I measured both levels. DEBUG raises DocService CPU by about 50% under co-edit load (0.077 → 0.115 cores). That cost is in the logging library's output, not in Common's own `logger.js`.

The full write-up is a new section in `baseline.md`; the raw numbers are in `perf/common-share-2026-11-02.json`.

**Decisions:**
- **Profiled from source:** the installed `docservice` binary ignores `NODE_OPTIONS`, so it can't be profiled. I ran DocService from this repository's source with Node 22, using the same environment and config as the installed service. Co-edit latency matched PKT-0018 (3 ms median), so the source run is representative.
- **New profiler script:** plain `--cpu-prof` mostly captures startup, when modules are loading, and only writes the profile on a clean exit. I added `perf/profile-toggle.js`: one `SIGUSR2` starts profiling, a second one writes the profile. `perf/profile-common.js` then splits the time between Common, DocService, libraries and Node internals.
- **ConvertService via `convert-large.js`:** `e2e-convert.js` sends no JWT, which this install requires, and it is outside my target. I used `convert-large.js` on the same en-US templates instead.
- **Machine restored:** DEBUG logging and the installed `docservice` are back as I found them; healthcheck returns true.
- **Not committed:** the raw profiles (tens of MB) are in `/tmp/prof`. I spawned no follow-up packet, since nothing in Common needs work for performance.

**Lessons for the Atlas** (also in the packet):
- Profile DocService from source with `profile-toggle.js`; the installed binary can't be profiled.
- Check the logging level before any CPU measurement, or say which level was on.
- Common is not a performance target.

My friction line is appended. It reports that the packet names `e2e-convert.js`, which can't run here, that the environment notes lack these two pitfalls, and that an empty acceptance list gives an investigation packet no proof step.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
