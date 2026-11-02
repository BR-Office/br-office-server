You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0036, described in .theseus/queue/ (search for PKT-0036). The changes to review are `git diff 2d1510800a4258cc687acc4a7a3de3dc9db12836..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've written the diagnosis to `.theseus/diagnosis/DIAG-x2t.md`. The verdict is **refactor, staying in C++**, and it is conditional on two first steps: profiling PDF export and building a test oracle. All three acceptance commands pass (`theseus validate`: 0 errors, 1 warning that same-family review is allowed in pilot mode), and the work is committed as `3539077`.

**Why refactor, from the baseline numbers:**
- **PDF export is where x2t costs users time.** It takes 0.65–1 s even on an empty file, against about 70 ms for ODF output, and 1.3–6.5 s on realistic files.
- **x2t also drives the save backlog.** Saves are assembled one at a time at about 0.45 s per document, so 200 editors leaving at once wait up to 95 s.
- **Open is not an x2t problem.** x2t takes only 0.1–0.3 s of an open; the rest is the browser.
- **The time isn't in x2t's own code.** x2t only routes each conversion. PDF export calls `doct_bin2pdf` (`lib/pdf_image.h:339`), which lays the document out with the editor's JavaScript (sdkjs) running in a V8 engine, then writes the PDF in C++. Changing x2t's language would not touch that.
- **No language change is allowed yet anyway.** There is no automated test oracle for x2t, so the spec's rule D1 rules out migrate and rewrite.

**Packet plan:**
- **P1 (wave 0, investigate):** split PDF export and save-conversion time into V8 startup, script load, layout and PDF writing.
- **P2 (wave 0, characterize):** a corpus oracle run on the installed `x2t` binary, comparing exit codes, output sizes and PDF text and page counts.
- **P3 (wave 1, refactor):** cut whichever fixed cost P1 shows to be largest.

P1 and P2 declare `requires: [documentserver]`.

**Surprises:**
- `external/core` is a read-only checkout until a fork exists, so P3 can't land code in this repository. It is told to deliver a patch and a note for humans if the fork still doesn't exist.
- The fixed ~0.6 s may turn out to be sdkjs code running inside x2t. If P1 shows that, x2t drops to **keep** and the work moves to the sdkjs modules. This is written into "What would change this verdict".

**What I couldn't do:**
- I took no measurements of my own, so how PDF time splits is unknown until P1 runs.
- Some commands were refused by permissions (reading the server repo's HEAD commit, piped `head`/`wc`/`sed` reads), so I used the card's `base_commit` (the `core` commit), unlike DIAG-docservice which recorded this repository's commit.
- I filed no spawn requests, because the follow-ups are the plan's own packets.

**Lessons for the Atlas:**
- The x2t card should record that PDF export runs through `CDoctrenderer` (V8 and sdkjs), so the "x2t cost" partly belongs to the sdkjs modules.
- The card has no metrics or profile yet; P1's results should go there.
- The card should record that `core` is a read-only checkout, which blocks refactors until a fork exists.

The packet's Executor log and the friction line in `.theseus/scoreboard/friction.jsonl` are updated.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
