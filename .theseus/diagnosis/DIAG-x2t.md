---
id: DIAG-x2t
module: x2t
verdict: refactor
target_language: null
confidence: medium
conditional_on: "PKT-0143 (persistent-converter sizing) shows >= 0.3 s per conversion gained by a kept warmed context"
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: 59458e06   # Euro-Office/core; core and core.base still identical (tree 83b890f3)
round: 3
wave: 0
covers: [x2t]
not_covered:
  - stage: server-open-x2t
    reason: "docx -> Editor.bin runs no V8/sdkjs (OOXML read + process start, 243-394 ms p50 = 3.2-7.9 % of the open journeys, which are 90 % client); the persistent-converter lever does not touch it; revisit only after the client stages shrink"
---

## Summary
**Refactor, in C++, toward a persistent converter that keeps one warmed JS context per editor.** Round 2 made the
oracle trustworthy (browser half stable, PKT-0107) and proved that no in-process cut reaches 0.2 s (PKT-0108:
V8 flags and warmed snapshots ≤ 0.05 s CPU, post-init snapshot bounded at 0.13–0.25 s). It changed no x2t code:
`external/core` is still byte-identical to `core.base`, so the user-felt cost is unchanged — convert-docx-pdf is
**98 % x2t (1174 ms)** and the save journey's x2t stage is 774 ms, both carrying the ~0.5 s CPU warm-up of a fresh
V8 context per process. The only lever left that reaches the goal is to stop paying that warm-up per conversion.

## What round 2 proved and what it did not deliver
| Packet | Proved | Delivered toward the goal? |
|---|---|---|
| PKT-0107 (P1) | Edit race fixed (`put_TextPrBold` + `expect` step); two consecutive x2t.sh PASS; round 3 run PASS again (x2t-r3.md) | **Yes, oracle** (D1 now usable for a core change); no user gain by itself |
| PKT-0108 (P2) | Warm-up is JS *execution* (NativeOpenFileData ≈ 0.2 s; empty pptx layout 0.58 s), not compile; no V8 flag ≥ 0.15 s CPU; `--max-lazy` crashes docx; docbuilder (new context per doc) gains nothing | Measurement only: closed the in-process path |
| PKT-0147 (P3) | Not run; its own context says stop when P2 finds < 0.2 s, which P2 did | **Not delivered**; should be discarded, superseded by this plan |
| PKT-0138 (spawned) | serve-integrated now regenerates `sdk-all.bin` so x2t runs the fork's word code | Correctness of the measurement; speed unchanged (convert 1.2–2.0 s, noise) — not delivered |
| PKT-0143 (spawned, pending) | — | Sizing of the persistent converter: the input of this round |

Round 2's speed delivery to users: **0 ms** (x2t binary unchanged, x2t-r3.md).

## Against the goal (ordered by the time each stage costs the user)
| Stage (journey) | ms p50 | Share | Finding | Evidence |
|---|---|---|---|---|
| `x2t` (convert-docx-pdf) | 1174 | 97.8 % | Fixed per process ~45 % (V8 + snapshot + editor init ≈ 390 ms), word layout + PDF ≈ 585 ms, OOXML read ≈ 75 ms | journeys/convert-docx-pdf.md; PKT-x2t-r2-warmup.md §1 |
| `x2t` (save) | 774 | 13.2 % | Apply changes in sdkjs + docx write; same fresh-context warm-up per save (bin→docx runs `CDoctrenderer::Execute`); the save journey is dominated by docservice's 5 s save delay | journeys/save.md |
| `server-open-x2t` (4 open journeys) | 243–394 | 3.2–7.9 % | docx→bin, C++ only, no V8 | journeys/open-*.md |
| Quality | — | — | Differential direct + browser PASS (round 3); no x2t defect measured; `--max-lazy` crash is a flag, not shipped | x2t-r3.md |
| Target language | — | — | None: the cost is JS run in V8 and the fresh-process model, not the C++ | PKT-0108 profile |

## Discarded alternatives
- **keep**: 1.17 s of a 1.2 s user journey sits in x2t and ≈ 0.5 s of it is removable warm-up.
- **in-process refactor (round 2 P3)**: measured ceiling 0.13–0.25 s, flags ≤ 0.05 s: below the 0.3 s bar.
- **migrate / rewrite**: no language change touches V8-hosted sdkjs execution; no crash history justifies a parser migration (D3).
- **retire**: x2t is the converter.

## Path of change
1. PKT-0143 (already queued) prototypes in the core fork a process that keeps one warmed context per editor and
   resets the document inside it, and measures per-document cost, memory and output equality.
2. P1 splits the save stage's 774 ms (warm-up vs apply-changes vs docx write), so the persistent design is sized
   for both journeys it would serve.
3. P2 (wave 1) implements the winner behind a switch: x2t gains a persistent mode (task loop over stdin, same
   `params.xml` per task, one exit code per task), FileConverter keeps a small pool and falls back to one process
   per task on any failure or after N tasks (isolation, memory). Proven by the differential oracle (direct + browser)
   and by the convert-docx-pdf and save journeys.

## Initial packet plan
| Key | Wave | Type | What | Gain toward the goal |
|---|---|---|---|---|
| P1 | 0 | investigate | Split the save journey's x2t stage (774 ms) into warm-up / apply changes / docx write | sizes the save share of P2 |
| P2 | 1 | refactor | Persistent x2t mode with a kept warmed context + FileConverter pool, behind a switch | −0.4…0.5 s of 1.17 s per PDF convert (≈ −40 %), −0.3…0.4 s per save (estimate, from PKT-0108) |

```yaml
packets:
  - key: P1
    wave: 0
    type: investigate
    title: Split the x2t stage of the save journey into warm-up, apply changes and docx write
    files: []
    create_in: [.theseus/diagnosis, .theseus/oracle/perf]
    depends_on: []
    requires: [documentserver]
    estimate: {files: 2, diff_lines: 250}
    acceptance:
      - test -s .theseus/diagnosis/PKT-x2t-r3-save-split.md
      - theseus validate
    goal: The save journey's x2t stage costs 774 ms p50 (journeys/save.md). Replay the same bin->docx task standalone (params.xml taken from the FileConverter DEBUG log of save.sh) with js_speed=1 laps and the CPU profile tools of .theseus/oracle/perf (x2t-cpuprofile.js, x2t-profile-tree.js, x2t-warmup.py, median of 5, wall and CPU) and record which part is document-independent warm-up (removable by a kept context) and which is applying changes and writing the docx, in .theseus/diagnosis/PKT-x2t-r3-save-split.md.
    context: PKT-0108 did the same split for -> pdf (warm-up ~0.5 s CPU, mostly NativeOpenFileData). Decide with CPU time; the VM is shared.
  - key: P2
    wave: 1
    type: refactor
    title: Persistent x2t mode that keeps one warmed JS context per editor, used by FileConverter
    files: [external/core/X2tConverter/src/main.cpp, external/core/DesktopEditor/doctrenderer/doctrenderer.cpp, FileConverter/sources/converter.js]
    create_in: [external/core/X2tConverter/src, external/core/DesktopEditor/doctrenderer, FileConverter/sources, .theseus/diagnosis]
    depends_on: [P1]
    requires: [documentserver, browser]
    estimate: {files: 6, diff_lines: 700}
    acceptance:
      - bash .theseus/oracle/differential/x2t.sh
      - bash .theseus/oracle/journeys/convert-docx-pdf.sh
      - theseus validate
    goal: Implement the design PKT-0143 sized - x2t keeps one warmed CDoctrenderer context per editor across tasks and resets the document inside it; FileConverter sends tasks to it and falls back to one process per task on failure or after N tasks - so that convert-docx-pdf drops by at least 0.3 s p50 with every check of the x2t differential oracle equal; record numbers (journey before/after, memory per warm context) in .theseus/diagnosis.
    context: If PKT-0143 measured < 0.3 s per document gained, or output not equal, stop and record it for a new diagnosis. A core-fork edit is a ~50-60 min rebuild (x2t-build.sh): plan one build. Default off behind a config switch so the FileConverter contract (params.xml, exit codes) stays valid.
```

## Risks
- State leaking between documents in a reused context (styles, `g_oTableId`, fonts): the differential oracle must
  run several documents through the same process, not one; P2 recycles the process after N tasks.
- Memory: one warm context per editor per worker; measured by PKT-0143 before P2.
- VM contention (±30 %): decide with CPU time and interleaved medians.

## What would change this verdict
- PKT-0143 gains < 0.3 s per document or cannot keep output equal → **keep** x2t, and move effort to sdkjs layout
  (the 585 ms layout + PDF part of convert belongs to sdkjs-word).
- A crash or defect history measured in core's C++ parsers would reopen a Rust migration of those parsers (D3).
