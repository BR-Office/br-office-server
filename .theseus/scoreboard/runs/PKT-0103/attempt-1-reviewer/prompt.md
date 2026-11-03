You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0103, described in .theseus/queue/ (search for PKT-0103). The changes to review are `git diff 46b5bac08099dc25cfd90b19c488f72fa38d6408..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
I've written the round 2 diagnosis for x2t, recorded the measurements and committed it (`024b052`). All acceptance commands pass, `theseus validate` shows no errors, and `theseus scope-check` is clean. The differential oracle failed on my first run and passed on the second; see below.

**What round 1 actually delivered:** no change to x2t's code. `external/core` and `external/core.base` are at the same commit, so the oracle builds one x2t and runs it on both sides. Round 1's speed gains exist only as patches:
- **V8 startup snapshots** cut about 0.1 s per PDF. They ship only as a packaging patch and are active only on this VM.
- **The text-shaping cache** cut 13–24 % of the time on very large spreadsheets. It is a patch to sdkjs (the editor's JavaScript), not to x2t, and has no pull request yet.

I counted both as not delivered.

**Differential oracle (original vs new):**
- **Run 1:** the direct comparison passed, but the browser half failed with 7 differences, all on `text-10p.docx`. Both sides were the same binary. The scripted edit sometimes finishes after the capture ("Local edit old" instead of "Local edit bold"). So this is noise in the test, not a real difference.
- **Run 2:** passed completely. The browser half therefore fails intermittently (1 of 2 runs here), and each run takes about 10 minutes.

**Measurements** (in `.theseus/oracle/rounds/x2t-r2.md`): converting an empty template to PDF still takes 0.68–1.25 s, against about 0.12 s for opening, saving or converting to ODF. That gap is a fixed cost every user pays on a PDF export, and it is all inside x2t. Timings varied by up to 2× between the two runs because other agents were using the machine, so read them as proportions.

**Verdict: refactor, in C++, conditional on a stable oracle.** The remaining fixed cost is the first JavaScript run inside a fresh V8 engine in every x2t process. The core fork is now writable, so this round can change the code. The plan for round 2:
- **P1:** fix the edit race in `x2t-run.cjs` so the browser oracle stops failing on its own noise.
- **P2:** profile that first run with snapshots on, and try two fixes in the core fork: taking the snapshot after a warm-up run, and changing V8 flags.
- **P3:** implement the better option in `doctrenderer.cpp`, aiming for at least 0.3 s less per PDF.

Keeping one x2t process alive between conversions is deferred. It would change the contract with FileConverter, so I'd only consider it if P2's options gain less than 0.2 s.

**Notes:** `DIAG-x2t-b.md` did not exist, so there was nothing to `git rm`. I did not edit the oracle, which is outside my target; fixing it is P1. The executor log and the friction line are written.

**Lessons for the Atlas:**
- Round 1's gains were real but never merged or shipped, which is why the module gained nothing. The method has no field to mark work that exists only as a patch; I noted that in the friction line.
- The x2t browser oracle is flaky and needs fixing before it can judge a real change to core.
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
timing x2t-direct rows-500.xlsx (median of 3 ms) | original open=117 save=208 own=170 pdf=2682 odf=315 | new open=175 save=117 own=118 pdf=2642 odf=269
same slides-12.pptx open (exit=0 6d13d32afd2c)
same slides-12.pptx save (exit=0 [Content_Types].xml:d1aebc1dcb1d _rels/.rels:d1a75180)
same slides-12.pptx own (exit=0 [Content_Types].xml:86e5db192ed2 _rels/.rels:a78b9781)
same slides-12.pptx pdf (exit=0 pages=12 text=1b207749d355 chars=2678)
same slides-12.pptx odf (exit=0 META-INF/manifest.xml:ce9e5d3460d5 content.xml:acf204)
timing x2t-direct slides-12.pptx (median of 3 ms) | original open=165 save=166 own=115 pdf=2132 odf=165 | new open=165 save=116 own=184 pdf=1981 odf=166
x2t-direct: PASS
timing x2t-browser text-10p.docx (median of 2 ms) | original open=3989 join=4166 edit=9990 save=283 topdf=192 toodt=338 reopen=3820 | new open=5439 join=6468 edit=11989 save=702 topdf=453 toodt=701 reopen=6847
same text-10p.docx model
same text-10p.docx sentA
same text-10p.docx sentB
same text-10p.docx shown
same text-10p.docx saved
same text-10p.docx converted.pdf
same text-10p.docx converted.odt
same text-10p.docx reopened
timing x2t-browser rows-500.xlsx (median of 2 ms) | original open=3838 join=4848 edit=9007 save=167 topdf=506 toods=471 reopen=5774 | new open=5697 join=5996 edit=8728 save=201 topdf=1286 toods=255 reopen=5402
same rows-500.xlsx model
same rows-500.xlsx sentA
same rows-500.xlsx sentB
same rows-500.xlsx shown
same rows-500.xlsx saved
same rows-500.xlsx converted.pdf
same rows-500.xlsx converted.ods
same rows-500.xlsx reopened
timing x2t-browser slides-12.pptx (median of 2 ms) | original open=6692 join=5738 edit=10242 save=210 topdf=202 toodp=284 reopen=6548 | new open=6611 join=6770 edit=9527 save=446 topdf=397 toodp=487 reopen=5637
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
- `git -C external/core diff refs/theseus/base..HEAD` (branch pkt/PKT-0103 of the fork https://github.com/BR-Office/br-office-core)
