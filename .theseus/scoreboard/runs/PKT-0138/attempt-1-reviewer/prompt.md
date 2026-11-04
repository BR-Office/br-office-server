You are the Reviewer in a Theseus project. Read AGENTS.md and .theseus/prompts/reviewer.md, then review work packet PKT-0138, described in .theseus/queue/ (search for PKT-0138). The changes to review are `git diff 8c3f245c32820763b341cb408674dbb598895ae1..HEAD` in this worktree. The factory chose you as reviewer according to rule R4 and the adapter's review settings (pilot mode may allow a reviewer of the same model family), so do not refuse on that ground. The factory has already checked the scope (rule R2) and run every acceptance command successfully (rule R3) on this exact commit, so you do not need to rerun them. Check the diff against the goal, the contract and the budget, and look for what the oracle does not catch: wrong or weak assertions, edge cases, error handling, behavior that was changed instead of characterized. Do not change any file.
Follow-up packets the executor requested are files in .theseus/spawn/ in the diff; the factory turns them into packets after approval.
Reject the packet (TEP-0004) if: the Executor log section of the packet is empty; the packet asked for follow-ups and neither the Spawned packets section nor .theseus/spawn/ lists them; or, for a characterize packet, a surprising behavior mentioned in the log is not kept in a test.

The executor's final report follows. If it says that something the packet's goal or context requires was not done or could not be done, reject and say what is missing.
<executor-report>
x2t now runs the integrated sdkjs word code during conversions. Before, it was still loading the packaged V8 snapshot `sdk-all.bin`. All five acceptance commands pass, including the differential x2t oracle (about 5 minutes). Scope-check is clean, and the work is committed on `pkt/PKT-0138`.

**Changed in `.theseus/oracle/serve-integrated.sh`:**
- **Snapshot rebuild:** on `up`, if `word/sdk-all.bin` is not newer than `sdk-all.js`, the script deletes it and runs `x2t -create-js-snapshots` as root (about 15 s). It then gives the `.bin` files back to user `ds`, and fails if the snapshot is still stale. `down` restores the packaged `.bin`, because the existing backup already copies `sdk-all*`.
- **No redundant copies:** `sdk-all.js` and `sdk-all-min.js` are copied only when they differ from the installed ones. A repeated `up` now takes 0.06 s and doesn't rebuild the snapshot.
- **sdkjs checkout:** if `external/sdkjs` is missing, `up` clones the fork's `theseus` branch shallow into it. That folder is git-excluded, so nothing gets committed.

**Surprises:**
- **No sdkjs in this worktree:** the factory didn't check out `external/sdkjs` here, so `up` failed until I added the clone.
- **The packet's premise was wrong:** a normal x2t conversion does not rebuild `sdk-all.bin`. It only writes `sdk-all.cache`. Only `x2t -create-js-snapshots` writes the `.bin`, and it rebuilds the snapshots of all five editors.
- **`ds` can't write the snapshot:** the sdkjs folders are read-only for `ds`, so the rebuild has to run as root.

**Measurements:** the numbers did not move beyond noise. Other worktrees were loading the machine and p50s swung between about 1.1 and 2.0 s, so treat these as rough.

| Journey (p50) | Integrated, after fix | Packaged (`down`) | Before fix |
|---|---|---|---|
| convert-docx-pdf (11 runs) | 2003 / 1173 ms (two series) | 1853 ms | 1216 ms (5 runs) |
| save (5 runs) | 6736 / 5778 ms | 5836 ms | not measured |

The fix is about correctness, not speed. I changed nothing in `external/core`, so no refactor packet is needed, and I requested no follow-up packets.

**Lesson for the Atlas** (recorded in the packet): x2t reads `sdkjs/<editor>/sdk-all.bin` whenever it exists and never rebuilds it during a conversion. After replacing any `sdk-all.js`, run `x2t -create-js-snapshots` as root.

The Executor log and the friction line are written.
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
timing x2t-direct rows-500.xlsx (median of 3 ms) | original open=64 save=65 own=65 pdf=1029 odf=165 | new open=64 save=65 own=64 pdf=1073 odf=215
same slides-12.pptx open (exit=0 6d13d32afd2c)
same slides-12.pptx save (exit=0 [Content_Types].xml:d1aebc1dcb1d _rels/.rels:d1a75180)
same slides-12.pptx own (exit=0 [Content_Types].xml:86e5db192ed2 _rels/.rels:a78b9781)
same slides-12.pptx pdf (exit=0 pages=12 text=1b207749d355 chars=2678)
same slides-12.pptx odf (exit=0 META-INF/manifest.xml:ce9e5d3460d5 content.xml:acf204)
timing x2t-direct slides-12.pptx (median of 3 ms) | original open=115 save=115 own=65 pdf=1222 odf=115 | new open=115 save=115 own=64 pdf=1173 odf=115
x2t-direct: PASS
timing x2t-browser text-10p.docx (median of 2 ms) | original open=3339 join=3212 edit=10527 save=219 topdf=195 toodt=256 reopen=2787 | new open=2876 join=3045 edit=10292 save=206 topdf=239 toodt=202 reopen=2909
same text-10p.docx model
same text-10p.docx sentA
same text-10p.docx sentB
same text-10p.docx shown
same text-10p.docx saved
same text-10p.docx converted.pdf
same text-10p.docx converted.odt
same text-10p.docx reopened
timing x2t-browser rows-500.xlsx (median of 2 ms) | original open=2574 join=2562 edit=7389 save=123 topdf=340 toods=166 reopen=2350 | new open=2664 join=2611 edit=7442 save=123 topdf=443 toods=151 reopen=2706
same rows-500.xlsx model
same rows-500.xlsx sentA
same rows-500.xlsx sentB
same rows-500.xlsx shown
same rows-500.xlsx saved
same rows-500.xlsx converted.pdf
same rows-500.xlsx converted.ods
same rows-500.xlsx reopened
timing x2t-browser slides-12.pptx (median of 2 ms) | original open=2844 join=3203 edit=8194 save=151 topdf=137 toodp=162 reopen=2784 | new open=2954 join=2937 edit=8108 save=168 topdf=199 toodp=171 reopen=3199
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
- `git -C external/core diff refs/theseus/base..HEAD` (branch pkt/PKT-0138 of the fork https://github.com/BR-Office/br-office-core)
