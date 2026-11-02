You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0042, described in .theseus/queue/ (search for PKT-0042). The changes to review are `git diff 39bc6cb1f18d8e4a8f6b1040395e438c4b812fdb..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I finished PKT-0042 and committed it as `45938e0`. Both acceptance commands pass: `.theseus/oracle/unit.sh` (178 passed, 1 skipped) and `npm run lint:check` (0 errors, 1 warning in an AdminPanel file I didn't touch). `theseus validate` reports 0 errors.

**What I added** (all under `.theseus/oracle/x2t/`):
- **`corpus.py`**: runs the installed x2t over a set of documents.
  - `run` converts each file in five directions and writes JSON: open (to Editor.bin), save (that Editor.bin back to docx/xlsx/pptx), own (docx/xlsx/pptx to the same format), pdf and odf.
  - It records the exit code and output size for each conversion. For PDFs it also records the page count and a hash of the extracted text.
  - `diff base new` exits 1 if an exit code, page count or text hash differs, if an output appears or disappears, or if a size changes by more than 10% (adjustable with `--size-tol`).
- **`make-corpus.py`**: generates a fixed set of documents with real text: a 10-page docx, a 500-row xlsx and a 12-slide pptx.
- **`baseline-9.3.7-1.json`**: results for the en-US `new.*` templates plus those generated documents, on the installed package 9.3.7-1. All 30 conversions exit 0, and two runs in a row gave identical results.

**Decisions**
- I call x2t directly with a `params.xml`, the way FileConverter does and the way `perf/convert-large.js` already did, so the oracle doesn't need DocService running.
- PDFs are compared by page count and normalized text, never by bytes, because PDF bytes change between runs (dates, ids).

**Surprises**
- The empty templates export PDFs with no text at all, so they can't check text. That is why I added `make-corpus.py`.
- I first used the wrong format codes for ods and odp (258 and 130). x2t returned exit 88 with no output; the right codes are 259 and 131.

**Not done**
- The large PKT-0016/0018 samples aren't in the baseline because they aren't committed and are slow to convert. They can be added with an extra `--corpus <dir>`.
- The save direction doesn't apply edits (no changes file); it only covers turning Editor.bin back into docx/xlsx/pptx.
- No timings; that is packet P1's job.

**Lessons for the Atlas** (also written in the packet):
- The x2t format codes: docx 65, odt 67, xlsx 257, ods 259, pptx 129, odp 131, pdf 513, Editor.bin 8192. They are missing from the x2t card, and a wrong one gives exit 88 with no output.
- Checking PDF text needs documents that have content; the empty templates don't.
- How to use the oracle: run `corpus.py run` with `--corpus` pointing at the templates and the generated documents, then `corpus.py diff` against `baseline-9.3.7-1.json`.

The Executor log and my friction line are filled in. I didn't request any follow-up packets, and no command was refused.
</executor-report>

End your answer with exactly one line, the last one:
VERDICT: APPROVE <short reason>
or
VERDICT: REJECT <what must be fixed>
or, when the goal cannot be met because something outside the agents' control is missing (an environment, a permission, a file outside the target), so that retrying cannot help:
VERDICT: BLOCK <what is needed, and who can provide it>
