You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0025, described in .theseus/queue/ (search for PKT-0025). The changes to review are `git diff bd13c2736db02f6c9fa1dc7afbb1e56d05e023fb..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've written the docservice diagnosis and committed it. The verdict is **refactor**, staying in JavaScript with no language change. All three acceptance commands pass; `theseus validate` gives 0 errors and one warning, which is the expected one about pilot mode.

**Why refactor:**
- **Speed:** a change of language would not be felt by users. On the server, receiving and re-sending a co-edit takes 4 ms of a round trip of about 100 ms. Opening a document takes 3–4 s, almost all in the browser. Conversions are 70–90 % the C++ converter (`x2t`).
- **What this module does cost users:**
  - A fixed 1 s wait in `converterservice.js:49,163` adds up to 900 ms to every synchronous ConvertService call.
  - It carries most of the upstream crash fixes, concentrated in `DocsCoServer.js` (4,736 lines) and `canvasservice.js`. Neither file has tests.
- **What would change the verdict:** if a split of open time showed the server at 10 % or more, or a load test past 1,000 sockets showed the server limiting, I'd reconsider moving the co-edit hot path to Go or Rust. That would need a second diagnosis from another model family (rule D3).

**Packet plan:**

| Key | Wave | Type | What |
|---|---|---|---|
| P1 | 0 | characterize | Tests for ConvertService in sync and async modes |
| P2 | 0 | characterize | Tests for the crash-prone co-edit paths in `DocsCoServer.js` |
| P3 | 1 | refactor | Replace the fixed 1 s poll with a short or growing one (after P1) |
| P4 | 1 | refactor | Add the missing guards, and fix `editorStat` at `DocsCoServer.js:155`, which is built with the wrong constructor (after P2) |
| P5 | 0 | investigate | Whether to bring in two upstream crash/hang fixes, bugs 81132 and 81576, that are missing from Euro-Office `main` (a decision for people) |

**Decisions:**
- I replaced the old `DIAG-docservice.md` without reading it, to keep this diagnosis independent.
- `DIAG-docservice-b.md` doesn't exist, so there was nothing to `git rm`.
- Save takes about 6 s mainly because of a 5 s delay set in configuration (`savetimeoutdelay`, in Common). I noted it in the diagnosis but planned no packet for it.
- I spawned no follow-up packets: the plan block in the diagnosis covers the follow-ups.

**Lesson for the Atlas:** the server is a small part of what users wait for. Its real costs are the synchronous conversion wait and the untested, crash-prone co-edit code.

One command was refused by permissions: a shell command that used a heredoc to edit the packet file. I made the same edits with the file tools instead.

The packet's Executor log, its Atlas lessons and the friction line are all written.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
