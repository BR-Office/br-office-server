You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0017, described in .theseus/queue/ (search for PKT-0017). The changes to review are `git diff 5731730146885d0183577faa1aa27d8a2ce2bf0a..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've added the defect and crash rate from upstream history to `.theseus/oracle/baseline.md`, including the bug-issue counts the reviewer rejected the last three attempts for. The acceptance command passes, `theseus validate` shows 0 errors (1 warning), and the work is committed as c81bbdf.

**What changed since the last attempts:** `gh api` and the per-repository GitHub API are still blocked (403), but the GitHub **search** API (`/search/issues`) works. So the goal didn't need narrowing and no follow-up packet was filed. The script from the earlier attempts wasn't on this branch, so I rewrote it as `.theseus/oracle/perf/defect-history.js` and recomputed every number from it.

**Results:**
- **Fix commits:** since 2020, 40–56% of server commits per year are fixes. Euro-Office `main` has 794 fixes out of 2,542 commits. To get that I counted commits with the same date and message once: `main` has 1,828 such duplicates from a rebase, which would nearly double the counts.
- **Crash-related fixes:** about 4–5 a year, 21 in total on Euro-Office `main`. Almost all are missing null/undefined checks or unhandled errors in the Node server code.
- **Where they concentrate:**

  | File | Fix commits | Crash fixes |
  |---|---|---|
  | `DocsCoServer.js` | 197 | 7 |
  | `canvasservice.js` | 131 | 5 |
  | `converter.js` | 61 | 5 |

  `DocsCoServer.js` alone gets about a quarter of all fix commits.
- **Bug issues:** ONLYOFFICE keeps all its issues in the product-wide DocumentServer tracker (the server repository has issues turned off), so these counts cover the editors too and overstate the server.

  | Tracker | Period | Issues | Labelled bug | Crash/hang |
  |---|---|---|---|---|
  | ONLYOFFICE (whole product) | 2024 / 2025 / 2026 | 478 / 432 / 293 | 200 / 202 / 147 (bug share rising from 38% in 2022 to 50% in 2026) | 6 / 12 / 19 |
  | Euro-Office/server | 2026 | 14 | 4 | 2 |
  | Euro-Office/DocumentServer | 2026 | 276 | 61 | 27 |

- **Decision for you:** two 2026 ONLYOFFICE crash fixes are not on Euro-Office `main`:
  - bug 81132 (process crash when a client disconnects during file streaming) exists only on Euro-Office side branches such as `release/v9.4.0`;
  - bug 81576 (`prepare4shutdown` hang) isn't on any Euro-Office branch.

  Whether to port them is your call; it's recorded in `baseline.md`.

**Things to know:**
- These are fixed defects, a stand-in for the crash rate users actually see; there's no production telemetry.
- The low fix share before 2018 reflects how commit messages were written then, not code quality.
- A search query with more than five ORs fails, so I simplified the crash query.
- I also updated the outdated "Defect history" bullet and the gap row in `baseline.md`, and filled in the Executor log.
- I appended a line to `.theseus/scoreboard/friction.jsonl`. That file is outside `target.files`, but `AGENTS.md` requires the entry.

**Lessons for the Atlas:**
- `environment.md` should say that only the per-repository GitHub API is blocked and that `/search/issues` works (30 requests a minute). Its current wording cost three attempts.
- Work from a rejected attempt should be committed on the branch, not just described in the log; otherwise it's lost and has to be redone.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
