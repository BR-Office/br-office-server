You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0158, described in .theseus/queue/ (search for PKT-0158). The changes to review are `git diff 5680febebbcfb9b9ceee53907f9c8de06132f22d..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I wrote the AUD-7 audit, two proposals (TEP-0016, TEP-0017) and two follow-up requests, and committed them on the packet branch. Both acceptance commands pass and `theseus scope-check` is ok. `theseus validate` reports one error: the `layout-finish-webapps` stage of journey `open-docx-100p` is not covered in `DIAG-web-apps-documenteditor.md`. My changes don't touch journey or diagnosis files, so it should have been there before, though I didn't run validate on a clean checkout to confirm. It's outside my target, so I left it.

**What the audit covers:** records 140–164, which is 25 records for 23 packets: 21 done, 3 blocked, 1 discarded.

**Main numbers:**
- **Approval on first review:** the scoreboard says 81%, but the real figure is 67%. PKT-0109, 0137 and 0149 failed an acceptance command and are still marked as approved on first review.
- **Blocked cost:** at most 14% of spend, down from 60% in AUD-6.
- **Median time for a done packet:** 8.9 minutes, down from 15.6.
- **Review cost:** 20% of done-packet cost. All 5 rejections that weren't acceptance failures were correct and specific.
- **Planner estimates:** they exist on only 7 of 25 records. On those, the line estimates are good, but the file counts are too low on all 7.

**Proposals under test:**
- **TEP-0011 (scope-check):** confirmed. Only one out-of-target rejection in 25 records.
- **TEP-0012 (new packet types):** confirmed for `measure` (75% approved on first review). No `chore` packet ran, and 2 friction lines still say a type was missing.
- **TEP-0013 (journeys):** the 10-page open is at 3662 ms against a 2.5 s target, so that half is not met yet.
- **TEP-0001 (stop on an external blocker):** confirmed, but PKT-0132 still used 4 attempts before it stopped on a speed-up too small to measure.

**New proposals:**
- **TEP-0016:** mark a record approved on first review only if nothing rejected it, drop the `out_of_context_reads` field (empty on every record for seven audits), and have the planner count packet, friction and spawn files in its file estimate.
- **TEP-0017:** when the differential test fails, it names each check that differed and reruns those once. A pass on rerun sets `flaky_oracle: true`. Today that field is never true, while 0109 and 0149 were rejected on differences that didn't reproduce.

**Follow-ups requested:** a shared helper for the journey test scripts, which have been copied four times. And a note in `environment.md` on where the `external/` repository mirrors are, since PKT-0137 and PKT-0138 found `external/` empty in their worktree.

**Decisions:**
- I reported approval both ways, as recorded and as corrected.
- I treated blocked cost as an upper bound because PKT-0132's cost entries look cumulative.
- I audited as claude-opus-5-5, the same model family that ran and reviewed every packet in the period, because no other family was available. This is recorded as F3.

**Lessons for the Atlas:**
- `theseus packet new --help` lists only 7 packet types, though the command accepts `chore` and `measure`.
- PKT-0133's record says 1 attempt while its block reason says 3.
- `journeys.jsonl` now exists, so journey timings can be read straight from the scoreboard.

All of this is in the packet's Executor log and in my friction line.
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
