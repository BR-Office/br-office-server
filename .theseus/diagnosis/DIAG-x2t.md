---
id: DIAG-x2t
module: x2t
verdict: refactor
target_language: null
confidence: medium
conditional_on: "P1 (stable browser oracle) done before any core change lands"
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: 59458e06   # Euro-Office/core; core and core.base identical (tree 83b890f3)
round: 2
wave: 0
---

## Summary
**Refactor, in C++, again — this time in the code.** Round 1 measured x2t well and found its lever, but
delivered no change to x2t itself: `external/core` is still byte-identical to `core.base` (same tree), so the
differential oracle builds one binary for both sides. The user-felt x2t cost is unchanged: any → PDF costs
0.68–1.25 s on an empty template against ~0.12 s for every other direction (x2t-r2.md). That fixed cost is the
first `CDoctrenderer::Execute` warm-up in a fresh V8 per process, which a now-writable fork of core lets us cut.
Before that, the browser half of the oracle must stop failing on its own noise.

## What round 1 proved and what it did not deliver
| Packet | Proved | Delivered toward the goal? |
|---|---|---|
| PKT-0041/0051 | Split of PDF export: small docs dominated by fixed JS cost (script load ≈ 0.35–0.44 s + first Execute 0.3–0.8 s); process start + V8 init ≈ 60 ms; PDF write ≈ 20 ms; big docs 54–88 % JS layout | Measurement only (decided P3's target) |
| PKT-0054 | xlsx → pdf big-50k: 79 % per-cell text measurement (HarfBuzz shaping) in sdkjs, linear | Measurement; moved work to sdkjs |
| PKT-0065 | V8 startup snapshots (`sdk-all.bin`) are already supported by x2t 9.3.7; −88…−106 ms (−10…14 %) per PDF, corpus equal | **Not delivered in code**: a deployment step, below the planned 0.3–0.6 s |
| PKT-0075 | Hook `-create-js-snapshots` into `documentserver-generate-allfonts.sh` | **Not delivered**: patch only (no packaging fork); active only on this VM |
| PKT-0069/0077/0082 | sdkjs shapeFragment cache: −13…24 % CPU on 25k–50k-row xlsx → pdf, 2605/2605 pages pixel-identical | **Not delivered**: sdkjs patch, PR not opened; it is sdkjs-cell code, not x2t |
| PKT-0042/0094 | Corpus oracle and differential oracle (direct + browser) | Oracle exists (D1 now `partial`); browser half is flaky (below) |

Round 1's P3 ("cut the dominant fixed cost") gained ≈ 0.1 s of the ≈ 0.6 s fixed cost, and only on a VM that
was set up by hand: correct but not shipped, so counted as not delivered.

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Goal: speed, convert | Empty → PDF 693–721 ms (docx), 675–677 (xlsx), 1043–1256 (pptx) vs 115–128 ms open/save/odf, with snapshots present. The ~0.55–1.1 s gap is fixed per process and all inside x2t. | x2t-r2.md direct timing |
| Goal: where | After snapshots, the remaining fixed cost is the first `Execute` warm-up (lazy compile / IC warm-up / font init in a fresh isolate) — PKT-0065: "only removable by a persistent renderer". | PKT-0065 log; PKT-0051 split |
| Goal: speed, open/save | open 116 ms, save 115 ms on templates; in the browser x2t's save 0.2–0.65 s and convert 0.2–0.8 s next to open/join 3.3–7.6 s (client). Save backlog (0.45 s/doc, serial) is per-process cost again. | x2t-r2.md; baseline PKT-0023 |
| Quality | Differential direct part PASS on 6 inputs × 5 directions; no defect measured in x2t. | x2t-r2.md |
| Oracle (D1) | Now `partial`: direct part deterministic; browser part FAILS with 7 "original side itself unstable" differences on text-10p.docx — the scripted local edit races ("Local edit old" vs "Local edit bold"). A real core change cannot be judged until this is fixed. | x2t-r2.md run 1 |
| Coupling | The persistent renderer touches the FileConverter contract (one x2t process per task, `params.xml`, exit codes); an in-x2t warm-up reduction does not. | card Invariants |
| Target language | None. The cost is V8-hosted JS; a language change of the C++ around it does not touch it. | as round 1 |

## Discarded alternatives
- **keep**: 0.55–1.1 s per PDF export and the per-process save cost are measured, user-felt and in x2t; round 1 gained nothing shipped.
- **migrate / rewrite**: the time is in JS run inside V8, not in the C++; no defect rate justifies a parser migration.
- **retire**: x2t is the converter.

## Path of change
1. Fix the browser oracle's edit race (P1) so original-vs-original is stable.
2. In the core fork, measure inside the first `Execute` what the warm-up is (P2: per-call `js_speed=1` laps,
   V8 inspector profile with snapshots on), and test the cheapest in-process lever: building the snapshot
   *after* a warm-up execution (warmed snapshot), or V8 flags (`--no-lazy-feedback-allocation`, code cache
   with eager compile) — all inside x2t, no contract change.
3. Implement the winner in `DesktopEditor/doctrenderer` (P3), proven equal by the differential oracle and
   faster by its direct timing on the empty templates. A persistent converter process (contract change with
   FileConverter) is deferred: decide on it only if P2 shows in-process levers gain < 0.2 s.

## Initial packet plan
| Key | Wave | Type | What | Gain toward the goal |
|---|---|---|---|---|
| P1 | 0 | refactor | Stabilize the browser half of the x2t differential oracle (edit race in `x2t-run.cjs`) | an oracle that can judge P3 (D1) |
| P2 | 0 | investigate | Profile the first-Execute warm-up of PDF export with snapshots on; prototype warmed snapshot / V8 flags in the core fork | decides P3; target −0.3 s per PDF |
| P3 | 1 | refactor | Implement the winning warm-up cut in doctrenderer | −0.3…0.5 s per PDF and per save (estimate) |

```yaml
packets:
  - key: P1
    wave: 0
    type: refactor
    title: Stabilize the browser half of the x2t differential oracle
    files: [.theseus/oracle/differential/x2t-run.cjs]
    create_in: [.theseus/oracle/differential]
    depends_on: []
    requires: [documentserver, browser]
    estimate: {files: 1, diff_lines: 80}
    acceptance:
      - bash .theseus/oracle/differential/x2t.sh
      - theseus validate
    goal: Make the browser part of x2t.sh stable when both sides run the same binary - the scripted local edit on text-10p.docx sometimes ends as "Local edit old" instead of "Local edit bold", producing 7 "original side itself unstable" differences (model, sentA, shown, saved, converted.pdf, converted.odt, reopened). Wait for the edit to be applied (model text check) before capturing; prove with two consecutive passing runs of x2t.sh.
    context: PKT-0103 run 1 in .theseus/oracle/rounds/x2t-r2.md. PKT-0094 already fixed a similar spell-check race with stableShown(). Do not add entries to x2t.intended to hide noise.
  - key: P2
    wave: 0
    type: investigate
    title: Profile the first-Execute warm-up of x2t PDF export and prototype in-process cuts
    files: []
    create_in: [.theseus/diagnosis, .theseus/oracle/perf]
    depends_on: []
    requires: [documentserver]
    estimate: {files: 2, diff_lines: 300}
    acceptance:
      - test -s .theseus/diagnosis/PKT-x2t-r2-warmup.md
      - theseus validate
    goal: With sdk-all.bin snapshots on, split the ~0.55-1.1 s fixed cost of empty docx/xlsx/pptx -> pdf (x2t-r2.md) inside the first CDoctrenderer::Execute (js_speed=1 laps, V8 inspector profile via x2t-cpuprofile.js) and prototype, on a build of the core fork, a snapshot taken after a warm-up run and V8 flag changes; record per-option gain (median of 5, direct timing) and corpus equality in .theseus/diagnosis/PKT-x2t-r2-warmup.md, and say which option P3 should implement.
    context: external/core is a writable fork (BR-Office/br-office-core); build with .theseus/oracle/differential/x2t-build.sh (cached by tree). Snapshot code in DesktopEditor/doctrenderer/doctrenderer.cpp (createJSSnapshots, sdk-all.bin load). PKT-0065 found snapshots gain only ~0.1 s.
  - key: P3
    wave: 1
    type: refactor
    title: Cut the first-Execute warm-up of x2t PDF export in doctrenderer
    files: [external/core/DesktopEditor/doctrenderer/doctrenderer.cpp]
    create_in: [external/core/DesktopEditor/doctrenderer, .theseus/diagnosis]
    depends_on: [P1, P2]
    requires: [documentserver, browser]
    estimate: {files: 3, diff_lines: 250}
    acceptance:
      - bash .theseus/oracle/differential/x2t.sh
      - theseus validate
    goal: Implement in the core fork the option P2 chose, so that empty-template -> pdf drops by at least 0.3 s (direct timing of x2t.sh, new vs original) with every other check of the differential oracle equal; record numbers in .theseus/diagnosis.
    context: If P2 finds no in-process option worth >= 0.2 s, stop and record that a persistent converter (FileConverter contract change) is the remaining lever, for a new diagnosis.
```

## Risks
- A warmed snapshot may embed document state and change output: the differential oracle (direct + browser) must stay equal.
- VM contention inflates wall times (±30 %): compare interleaved medians, not single runs.
- Snapshots are still shipped only by a packaging patch (PKT-0075): on a fresh install P3's gain may sit on
  a path that is not active. P2 must measure with and without `sdk-all.bin`.

## What would change this verdict
- If P2 shows the warm-up is < 0.2 s or cannot be cut in-process, move to a persistent-converter design
  (x2t + FileConverter, contract change) with its own diagnosis, or to **keep** if PDF export is rare in the deployment.
- If the sdkjs shape cache and snapshot packaging are merged upstream, re-measure: x2t's remaining cost may drop below user perception.
- A measured crash history in core's C++ parsers would reopen a Rust migration of those parsers (D3).
