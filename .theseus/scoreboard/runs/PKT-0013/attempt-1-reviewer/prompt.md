You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0013, described in .theseus/queue/ (search for PKT-0013). The changes to review are `git diff 2a58992cad8b7eb7ace9d8f7c5af519a8b79f671..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I finished PKT-0013 and committed it on the current branch. The acceptance check `test -s .theseus/oracle/baseline.md` passes. The baseline has real numbers for in-process server costs only. It has no end-to-end latency, no client numbers and no unit-test results, because I couldn't run those here.

**What I measured**
- **`.theseus/oracle/baseline.md`** (with `goals_hash: aa3a116b`): lists open, co-edit, save and convert, and where each one runs. The server parts are in this repo. Most of the work for open, save and convert happens in the conversion engine x2t (C++, in the `core` repo) and in the browser editor (`sdkjs`/`web-apps`), neither of which is in this repo.
- **`.theseus/oracle/perf/bench-hotpaths.js`**: small timing tests of the server code that runs on each user action. I ran it from the repo root. These are single runs on a sandbox, so treat them as rough (about ±20%):

  | Path | p50 | Throughput (1 core) |
  |---|---|---|
  | Reading and re-writing the JSON of a 50-change co-edit message | ~60 µs | ~14k msg/s |
  | Lock add/get/remove (in-memory) | ~4.5 µs | ~159k op/s |
  | Format detection on open/convert | under 1 µs | — |

  The JSON handling is the biggest cost found, but everything measured takes microseconds, far below network, database and conversion times. Rewriting these paths in another language alone wouldn't be noticeable to users.
- **`.theseus/oracle/perf/quality.sh`**: runs the unit tests and counts fix-like commits in git history. I wrote it but couldn't run it.
- **Code size as a risk signal:** `DocsCoServer.js` is 4,736 lines and holds almost all co-edit coordination, which makes it the main place defects are likely.

**What's missing**
- **Unit tests:** running `.theseus/oracle/unit.sh` and `quality.sh` was refused by my permissions, so the baseline has no unit-test results or duration. Commands starting with `VAR=...` or `cd ... &&` were refused too.
- **Defect rate:** git history here only starts on 2026-10-28 (89 commits, 3 that look like fixes), so it's too short to use. The upstream history is needed.
- **End-to-end and client numbers:** the full server can't run in this sandbox (no RabbitMQ, no x2t binaries), and the client code lives in other repos.
- **Friction log:** I didn't add the entry to `.theseus/scoreboard/friction.jsonl` because that file is outside this packet's allowed files.

**Follow-ups:** I created and committed two packet requests in `.theseus/spawn/`:
- **Measure end-to-end server latency:** needs the full server running, plus the upstream defect history.
- **Measure client-side performance:** needs access to the client repos and a browser.

**Lessons for the Atlas**
- Scripts that load the shared `Common/` modules outside the test runner must run from `DocService/`, with `NODE_CONFIG_DIR=../Common/config` and `NODE_ENV=development-linux`. The logging config uses paths relative to that folder, so the benchmark switches into it itself.
- The Node server mostly coordinates. The CPU time users feel on open, save and convert is in x2t and the browser editor, outside this repo.

The decisions, surprises and gaps are also written in the packet's Executor log.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
