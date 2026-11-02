---
id: DIAG-x2t
module: x2t
verdict: refactor
target_language: null
confidence: medium
conditional_on: "P1 (measure the PDF export split) and P2 (characterize x2t on a corpus) done"
diagnosed_by: [claude-opus-5-5]
agreement: full
decided_by: null
goals_hash: dcb03039
base_commit: e32956dd2c9cb3ffeb276c9bd5793ee04d0fce31   # Euro-Office/core, per the x2t card
wave: 0
---

## Summary
**Refactor, in C++ (conditional on measurement and an oracle).** x2t is where the user-felt server time
is: 70–90 % of every PDF conversion, 1.3–6.5 s for PDF export of realistic files, and the serial save
backlog (0.45 s per document behind one converter). But the dispatcher in `X2tConverter` is a thin
orchestrator; the PDF cost lies in its callees: `doct_bin2pdf` runs the sdkjs layout inside V8 through
`CDoctrenderer` and then writes the PDF with `CPdfFile`. Nothing yet says how that time splits, and the
oracle is `none`, so no language change can be justified or proven (D1). First measure and characterize,
then refactor the measured hot spot in place.

## Against the goal
| Question | Finding | Evidence |
|---|---|---|
| Goal: speed, convert | Anything → PDF costs 0.65–1.0 s raw even for an empty template, against ~70 ms for ODF: an order of magnitude, all inside x2t. On realistic files PDF export is 1.3 s (docx 10 p), 3.5 s (docx 100 p), 6.5 s (xlsx 10 k rows); DocService overhead ≈ 0.1 s. | baseline.md PKT-0015 table "raw x2t p50"; PKT-0018 "Large files" |
| Goal: where in x2t | PDF export goes `doct_bin2pdf` → `CDoctrenderer::Execute` (V8 + sdkjs layout to `pdf.bin`) → `CPdfFile` writer. The fixed ~0.6 s on empty docs points at V8/DocBuilder init and sdkjs script load per process (`CDocBuilder::Initialize()` per run), not the dispatcher. Unmeasured: the split is the first packet. | `X2tConverter/src/lib/pdf_image.h:339-366`; `ASCConverters.cpp:126,136,1753`; card Open questions |
| Goal: speed, open | Open conversion (→ Editor.bin) is 0.1–0.3 s even on large files, overlapping with 1.5–2.3 s of client script load: x2t is a few % of open. No gain for users here. | baseline.md PKT-0016, PKT-0018 "raw x2t open" |
| Goal: speed, save | Save assembly is serial at ≈ 0.45 s per document (`maxprocesscount` = 1): 200 editors leaving wait up to 95 s. Per-process x2t cost (incl. V8 init) multiplies here; the converter count is configuration in FileConverter, not x2t code. | baseline.md PKT-0023 |
| Goal: throughput | CPU-bound: 4 parallel conversions give 1.4× (PDF) on 2 CPUs. Cutting per-conversion CPU is the only in-module lever. | baseline.md PKT-0015 |
| Quality and security risk | No upstream fix history measured for `core`; FileConverter (the caller here) has 71 fix / 259 commits, 5 crash fixes in `converter.js`. x2t parses untrusted files (C++, memory-unsafe), process-wide temp-path global, `checkInputLimits` without null checks. Unmeasured risk, not a measured defect rate. | baseline.md PKT-0017 "Where fixes concentrate"; card Pitfalls |
| Oracle (D1) | `none`: test harnesses in `test/` are manual and not in CI. A practical oracle is the installed `x2t` binary over a corpus, comparing exit codes and outputs (text/page count for PDF). | card "Available oracle" |
| Coupling and interop | Contract with FileConverter: `params.xml` schema and exit-code mapping (`getReturnErrorCode`). Effective scope is the whole of `external/core` (PdfFile, DocxRenderer, DesktopEditor, doctrenderer, OOXML…). | card Invariants, Entry points |
| Target language | None now. The cost is in V8-hosted sdkjs layout and C++ rendering libraries; rewriting the ~10.8 k-line dispatcher in Rust/Go would not touch them. A Rust replacement of the untrusted-input parsers could serve quality, but there is no measured defect rate to justify it yet. | card Responsibility; measurements above |

## Discarded alternatives
- **keep**: PDF export (1.3–6.5 s) and the per-process cost behind the save backlog are measured, user-felt and inside x2t's process; doing nothing forgoes the largest server-side speed gain available.
- **migrate (rust/go)**: the dispatcher is not where the time is; migrating the callees (PdfFile, doctrenderer, OOXML readers) is a multi-module decision with oracle `none` (D1 forbids it now). Reassess after P1/P2 if a parser shows a defect or a CPU profile that a language change addresses.
- **rewrite**: same as migrate, and the contract (`params.xml`, ~100 conversion directions, exit codes) is wide.
- **retire**: x2t is the converter; every open, save and convert uses it.

## Path of change
Not a language change. Order: (1) measure the split of PDF export and of a save conversion
(process start, V8/DocBuilder init, script/snapshot load, layout, PDF write); (2) build a corpus oracle
on the installed binary; (3) refactor the dominant part in place — candidates, decided by P1: reuse of V8
snapshots/JS cache (`-create-js-snapshots` exists), avoiding per-process `CDocBuilder::Initialize` for
directions that do not need it, or a persistent converter process. Note: `external/core` is a read-only
checkout until a fork exists (adapter comment), so refactor packets of wave 1 need the fork first.

## Initial packet plan
| Key | Wave | Type | What | Gain toward the goal |
|---|---|---|---|---|
| P1 | 0 | investigate | Profile x2t PDF export and save conversion: split into process start, V8 init, script load, layout, PDF write | decides the refactor target |
| P2 | 0 | characterize | Corpus oracle on the installed `x2t`: exit codes, output sizes, PDF page/text per direction used by the server | oracle for wave 1 (D1) |
| P3 | 1 | refactor | Cut the dominant fixed cost found by P1 (e.g. V8 snapshot/JS cache, init only when needed) | −0.3…0.6 s per PDF, faster save backlog (estimate, to be measured) |

```yaml
packets:
  - key: P1
    wave: 0
    type: investigate
    title: Profile x2t PDF export and save conversion
    files: []
    create_in: [.theseus/oracle/perf, .theseus/diagnosis]
    depends_on: []
    requires: [documentserver]
    goal: Split the time of raw x2t docx/xlsx/pptx -> pdf (empty templates and the PKT-0016 samples) and of a save conversion (Editor.bin + changes -> docx) into process start, CDocBuilder/V8 initialization, sdkjs script or snapshot load, layout in CDoctrenderer::Execute, and CPdfFile writing; record numbers in baseline.md and say which part dominates.
    context: Baseline PKT-0015/PKT-0018 - empty docx->pdf 0.65 s raw vs 70 ms for ODF; large files 1.3-6.5 s. Path is X2tConverter/src/lib/pdf_image.h:339 doct_bin2pdf. Use perf/strace/ltrace or timestamps from the installed binary; x2t lives in /var/www/euro-office/documentserver/server/FileConverter/bin. Check whether the package ships JS snapshots/cache (x2t -create-js-snapshots).
  - key: P2
    wave: 0
    type: characterize
    title: Characterize x2t on a document corpus
    files: []
    create_in: [.theseus/oracle/x2t]
    depends_on: []
    requires: [documentserver]
    goal: A script that runs the installed x2t over a corpus for the directions the server uses (open -> Editor.bin, save -> docx/xlsx/pptx, -> pdf, -> odf) and records exit code, output size and, for PDF, page count and extracted text, so a later x2t build can be compared to it.
    context: Card x2t "Available oracle" - none automated. Invariants - exit code mapping and params.xml schema are the FileConverter contract. Samples - en-US new.* templates and the PKT-0016 generated files.
  - key: P3
    wave: 1
    type: refactor
    title: Cut the dominant fixed cost of x2t PDF export
    files: []
    create_in: [.theseus/diagnosis]
    depends_on: [P1, P2]
    goal: Using P1's split, propose and (once a writable fork of Euro-Office/core exists) implement the in-place change that removes the dominant per-process cost of PDF export, proven equal by P2's corpus oracle and faster by convert-large.js.
    context: external/core is a read-only checkout until forks exist; if still so, deliver the change as a patch and a decision note for humans. Candidates - V8 snapshots/JS cache, skipping CDocBuilder::Initialize where not needed, a persistent converter.
```

## Risks
- P1 may show the time is in sdkjs layout code (JavaScript run inside x2t), which belongs to the sdkjs
  modules, not here: then P3 moves to an sdkjs packet.
- PDF output is not byte-stable (dates, ids): P2 must compare normalized text/page counts, or it will flag false regressions.
- Without a fork of `core`, wave 1 cannot land; the gain stays a proposal.

## What would change this verdict
- If P1 shows < 20 % of PDF export in fixed per-process cost and the rest in sdkjs layout, downgrade x2t to
  **keep** and move the work to sdkjs-word/sdkjs-common.
- If a measured crash/defect history of `core` (fuzzing or upstream issues) concentrates in the C++ format
  parsers, reassess **migrate** of those parsers to Rust, with a D3 double diagnosis and P2 as the oracle.
- If the save backlog is solved by configuration (`maxprocesscount`, more converters) and PDF export is
  rare in the deployment, lower P3's priority.
