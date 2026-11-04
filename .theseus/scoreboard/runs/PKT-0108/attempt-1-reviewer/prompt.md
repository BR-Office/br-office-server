You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0108, described in .theseus/queue/ (search for PKT-0108). The changes to review are `git diff d0e147f2390540d23b14d8c9aefa47fb7b6ff99e..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
PKT-0108 is finished and committed (`1b128b4`, `c910b22`). Nothing from the earlier sessions had been saved to disk, so I redid the whole packet in this session. **Verdict for P3: don't build an in-process warm-up cut.** Nothing I tried saves 0.2 s or more. The lever left is a converter process that keeps one warmed-up JavaScript context per editor and reuses it for each document. I've filed a request for a packet to size that.

**Where the time goes** (`js_speed=1` laps; the VM is shared, so timings are the median of 5 and I judged on CPU time, using wall time only as a cross-check):
- With snapshots on, loading the scripts takes only about 10 ms.
- The cost is in opening the document: about 0.2 s for docx, xlsx and pptx.
- The empty pptx also spends 0.58 s on layout. I did not profile that, and it is the one open question: if it turns out not to depend on the document, it could change the answer for pptx.
- The CPU profiles (docx and xlsx; the xlsx one was missing last time) show the cost is mostly JavaScript running to build the editor's starting state: default styles, table styles, editor setup. Compiling the scripts is a small part.
- The part that doesn't depend on the document, which is the most a snapshot taken after a warm-up could save, is about 0.17–0.25 s for docx and 0.13–0.19 s for xlsx. That is short of P3's 0.3 s target.

**Options measured:**

| Option | Result |
|---|---|
| Snapshots on vs off | Snapshots still save 0.05–0.1 s of CPU; keep them |
| V8 flags (5 tried) | None saves 0.15 s of CPU or more; `--max-lazy` crashes docx → pdf (exit −4) |
| Snapshot with the style setup pre-run | 25–49 ms faster on docx (docx was the only one tested) |
| `docbuilder`, 3 documents in one process | Each extra document costs as much CPU as the first (about 640 ms), so a long-running process that starts a fresh context per document gains nothing |

Apart from the `--max-lazy` crash, every option produced the same PDFs for the three empty templates, ignoring dates and IDs. I did not run the full corpus check, since I'm not recommending any of these options.

**Decisions:**
- **No build of the core fork.** The reviewer had blocked the packet because the goal asks for a warm snapshot built there. Each edit there means a full rebuild of about 50–60 minutes, which is what ran the earlier sessions out of time. The profile already caps that result below 0.3 s. Instead I prototyped a warmer snapshot on the installed x2t: extra setup code appended to a copy of `sdk-all.js`, with the snapshot regenerated in a side copy of the install. `external/core` is unchanged, so there is nothing to push.
- **V8 flags without a rebuild:** a small preload library passes them to the installed x2t (`oracle/perf/x2t-v8flags-shim.c`).
- **First timing run discarded:** it ran while the differential oracle was swapping the live x2t, so I re-ran it clean. The verdict was the same.

**Not done:** pptx was not CPU-profiled, and the pre-run-styles snapshot was timed on docx only.

**Checks:** all three acceptance commands pass (the differential oracle printed PASS), and `theseus scope-check` is clean. The installed x2t is a source build of `core.base`, not the package's binary.

**Lessons for the Atlas** (also written in the packet):
- The warm-up is JavaScript building state, not compilation, so snapshots and V8 flags can't remove it.
- V8 flags and snapshot variants can be tried on the installed x2t without rebuilding (preload library; `x2t -create-js-snapshots` in a side copy).
- On this VM, time x2t by CPU (`oracle/perf/x2t-warmup.py`), and never while the differential oracle is running.

My friction line notes the cost of rebuilding the fork and that nothing in the method says to commit early in long investigations.

Files are in `.theseus/`:
- `diagnosis/PKT-x2t-r2-warmup.md`
- `spawn/PKT-0108-size-a-persistent-x2t-converter-that-keeps-one-w.md`
- `oracle/perf/x2t-warmup.py`
- `oracle/perf/x2t-v8flags-shim.c`
- `oracle/perf/x2t-profile-tree.js`
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
timing x2t-direct rows-500.xlsx (median of 3 ms) | original open=116 save=116 own=116 pdf=1384 odf=218 | new open=125 save=115 own=87 pdf=1220 odf=221
same slides-12.pptx open (exit=0 6d13d32afd2c)
same slides-12.pptx save (exit=0 [Content_Types].xml:d1aebc1dcb1d _rels/.rels:d1a75180)
same slides-12.pptx own (exit=0 [Content_Types].xml:86e5db192ed2 _rels/.rels:a78b9781)
same slides-12.pptx pdf (exit=0 pages=12 text=1b207749d355 chars=2678)
same slides-12.pptx odf (exit=0 META-INF/manifest.xml:ce9e5d3460d5 content.xml:acf204)
timing x2t-direct slides-12.pptx (median of 3 ms) | original open=115 save=115 own=115 pdf=1224 odf=114 | new open=165 save=115 own=115 pdf=1173 odf=116
x2t-direct: PASS
timing x2t-browser text-10p.docx (median of 2 ms) | original open=2754 join=3184 edit=10256 save=209 topdf=210 toodt=234 reopen=3207 | new open=3283 join=3247 edit=10312 save=243 topdf=177 toodt=203 reopen=2915
same text-10p.docx model
same text-10p.docx sentA
same text-10p.docx sentB
same text-10p.docx shown
same text-10p.docx saved
same text-10p.docx converted.pdf
same text-10p.docx converted.odt
same text-10p.docx reopened
timing x2t-browser rows-500.xlsx (median of 2 ms) | original open=3167 join=3129 edit=7510 save=137 topdf=421 toods=212 reopen=2698 | new open=2638 join=2816 edit=7469 save=132 topdf=326 toods=183 reopen=2709
same rows-500.xlsx model
same rows-500.xlsx sentA
same rows-500.xlsx sentB
same rows-500.xlsx shown
same rows-500.xlsx saved
same rows-500.xlsx converted.pdf
same rows-500.xlsx converted.ods
same rows-500.xlsx reopened
timing x2t-browser slides-12.pptx (median of 2 ms) | original open=3220 join=3154 edit=8271 save=173 topdf=162 toodp=195 reopen=3120 | new open=3197 join=2937 edit=8178 save=182 topdf=159 toodp=163 reopen=2895
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
For a performance goal, reject when the measured difference against the original is absent or zero: a change that is correct but does not make what users do faster or safer does not meet the goal. A difference smaller than the spread between repeated runs of identical code is not a gain.

Part of this packet changes another repository, checked out (and git-excluded) in this worktree; review those changes too:
- `git -C external/core diff refs/theseus/base..HEAD` (branch pkt/PKT-0108 of the fork https://github.com/BR-Office/br-office-core)
