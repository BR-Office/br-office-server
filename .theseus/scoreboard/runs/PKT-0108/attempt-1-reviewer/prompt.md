You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0108, described in .theseus/queue/ (search for PKT-0108). The changes to review are `git diff 6b97681945251602c71057a216834c375972d7f8..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I finished PKT-0108. The finding: none of the in-process options I tried saves 0.2 s or more, so P3 should not build an in-process cut. The remaining lever is a converter process that stays alive between conversions. All three acceptance commands pass (`test -s`, `theseus validate` with 0 errors, `x2t.sh` with both the direct and browser parts passing), `theseus scope-check` is clean, and the work is committed as 83acf53.

**Where the time goes** (empty documents → PDF, snapshots on):
- **Fixed part:** about 60 ms to start the process and about 145 ms to load the snapshot.
- **Per-document JavaScript:** for docx, opening the file data takes 250–300 ms; for pptx, laying out the document takes about 455 ms.
- **CPU profile:** about 70% is real JavaScript work (font tables, default styles, reading the file, layout), about 20% is V8's own time (compiler and native code, compilation at most part of it) and 4–13% is garbage collection. So the time is mostly real work, not compiling code a snapshot could keep.

**Options tried** (median of 5, wall time and CPU time; xlsx was timed but not profiled):
- **V8 flags** (`--single-threaded`, `--no-opt`, `--no-lazy-feedback-allocation`): at most about 0.05–0.08 s, which is within run-to-run noise.
- **`--max-lazy`:** crashes docx → pdf.
- **Snapshot made with compilation forced up front (`--no-lazy`):** 0.12–0.17 s slower, because the snapshot files are about 2.2 times larger and take longer to load.
- **Output equality:** the forced-compilation snapshot and the `--no-lazy-feedback-allocation` setting produce output equal to the baseline on the corpus.

**What I decided:**
- **No core changes:** the packet lists no target files in `external/core`, so I didn't change or build it. V8 flags are passed to the installed x2t through a small preloaded library (`x2t-v8flags-shim.c`), which works because `libdoctrenderer.so` exports `v8::V8::SetFlagsFromString`.
- **Real "after warm-up" snapshot:** not built. It would need the snapshot code to provide the native objects, a large C++ change. I sized it in the note instead: at most about 0.1 s, which is below the threshold.
- **Separate test copies:** every option ran in its own copy of the converter in the scratch directory, so the live server was never touched.
- **CPU time as well as wall time:** other sessions kept the 2-CPU VM busy (load 3.3–4.7), and wall-clock medians moved by up to 60% between runs. The timing script therefore also records CPU time.

**Files added:**
- `.theseus/diagnosis/PKT-x2t-r2-warmup.md`: the time split, option table, equality results and P3 verdict.
- `.theseus/oracle/perf/x2t-warmup.sh`, `x2t-warmup-time.py` and `x2t-v8flags-shim.c`: the scripts to rerun it.
- The Executor log, the Lessons for the Atlas and my friction line.

**Lessons for the Atlas:**
- V8 flags can be tested on x2t without rebuilding core, through that preloaded library.
- The warm-up is per-document JavaScript work. V8 settings recover less than 0.1 s; only a converter that stays alive removes it.
- On this VM, record CPU time next to wall time.
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

The differential oracle compared the original code with this packet's code (with everything already merged into the fork) on the same inputs. Its output:
<differential>
same rows-500.xlsx own (exit=0 [Content_Types].xml:a404994af7ac _rels/.rels:ef20857d)
same rows-500.xlsx pdf (exit=0 pages=11 text=a9a04b930357 chars=12526)
same rows-500.xlsx odf (exit=0 META-INF/manifest.xml:d78a4733465f content.xml:8aa47c)
timing x2t-direct rows-500.xlsx (median of 3 ms) | original open=115 save=115 own=124 pdf=1602 odf=273 | new open=115 save=117 own=115 pdf=1274 odf=227
same slides-12.pptx open (exit=0 6d13d32afd2c)
same slides-12.pptx save (exit=0 [Content_Types].xml:d1aebc1dcb1d _rels/.rels:d1a75180)
same slides-12.pptx own (exit=0 [Content_Types].xml:86e5db192ed2 _rels/.rels:a78b9781)
same slides-12.pptx pdf (exit=0 pages=12 text=1b207749d355 chars=2678)
same slides-12.pptx odf (exit=0 META-INF/manifest.xml:ce9e5d3460d5 content.xml:acf204)
timing x2t-direct slides-12.pptx (median of 3 ms) | original open=116 save=115 own=116 pdf=1605 odf=168 | new open=115 save=115 own=115 pdf=1399 odf=116
x2t-direct: PASS
timing x2t-browser text-10p.docx (median of 2 ms) | original open=3261 join=3582 edit=9658 save=308 topdf=176 toodt=340 reopen=3054 | new open=3278 join=3444 edit=9926 save=319 topdf=187 toodt=348 reopen=3219
same text-10p.docx model
same text-10p.docx sentA
same text-10p.docx sentB
same text-10p.docx shown
same text-10p.docx saved
same text-10p.docx converted.pdf
same text-10p.docx converted.odt
same text-10p.docx reopened
timing x2t-browser rows-500.xlsx (median of 2 ms) | original open=3084 join=3026 edit=7482 save=130 topdf=373 toods=171 reopen=2934 | new open=3029 join=2790 edit=7486 save=139 topdf=388 toods=166 reopen=2843
same rows-500.xlsx model
same rows-500.xlsx sentA
same rows-500.xlsx sentB
same rows-500.xlsx shown
same rows-500.xlsx saved
same rows-500.xlsx converted.pdf
same rows-500.xlsx converted.ods
same rows-500.xlsx reopened
timing x2t-browser slides-12.pptx (median of 2 ms) | original open=3370 join=3359 edit=8324 save=184 topdf=216 toodp=170 reopen=3016 | new open=3406 join=3262 edit=8400 save=192 topdf=162 toodp=172 reopen=3007
same slides-12.pptx model
same slides-12.pptx sentA
same slides-12.pptx sentB
same slides-12.pptx shown
same slides-12.pptx saved
same slides-12.pptx converted.pdf
same slides-12.pptx converted.odp
same slides-12.pptx reopened
x2t-browser: PASS (3 cases, 2 repeat(s) per side)
differential x2t: PASS
</differential>
For a performance goal, reject when the measured difference against the original is absent or zero: a change that is correct but does not make what users do faster or safer does not meet the goal.

Part of this packet changes another repository, checked out (and git-excluded) in this worktree; review those changes too:
- `git -C external/core diff refs/theseus/base..HEAD` (branch pkt/PKT-0108 of the fork https://github.com/BR-Office/br-office-core)
