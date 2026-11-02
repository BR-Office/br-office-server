# PKT-0065 — Cutting the fixed cost of x2t PDF export: V8 startup snapshots

Decision note for humans (plan x2t P3). Measured 2026-11-02 on the factory VM (2 CPUs, 7 GB), **native package**
euro-office-documentserver 9.3.7-1, DocService/FileConverter on 127.0.0.1:80.

## What P1 left on the table

PKT-0041: on small documents ≈ 330 ms of each x2t run is script load (code-cache deserialization + top-level run of
`sdk-all.js`) and 270–680 ms is first-Execute warm-up. Process start + V8 init is only ≈ 60 ms.

## Candidates

| Candidate | Removes | Needs core change? | Decision |
|---|---|---|---|
| V8 startup snapshot `sdk-all.bin` (`x2t -create-js-snapshots`) | part of script load | **No**: the 9.3.7-1 x2t already has `NExtractTools::createJSSnapshots` and loads `sdk-all.bin` when present | **Do now** (deployment step) |
| Skip `CDocBuilder::Initialize` where unneeded | small part of the ≈ 60 ms | yes | not worth it: too little time |
| Persistent / pooled doctrenderer | script load + warm-up (≈ 0.6–1 s) | yes, large (process model, isolation, memory) | defer until a writable fork of Euro-Office/core exists; needs its own diagnosis |

## Measurement (proof of speed)

`node .theseus/oracle/perf/convert-large.js <dir with new.{docx,xlsx,pptx}> 5`, idle server, once with the five
`sdkjs/{word,cell,slide,pdf,visio}/sdk-all.bin` in place, once with them moved aside (then restored).
Raw JSON: `PKT-0065-convert-large-snapshots.json`, `PKT-0065-convert-large-nosnapshots.json`.

| → pdf | service p50 without | service p50 with | Δ | raw x2t without | raw x2t with |
|---|---|---|---|---|---|
| new.docx | 719 ms | 631 ms | −88 ms (−12 %) | 605 ms | 518 ms |
| new.xlsx | 722 ms | 621 ms | −101 ms (−14 %) | 634 ms | 540 ms |
| new.pptx | 1015 ms | 909 ms | −106 ms (−10 %) | 1107 ms | 820 ms |

PDF throughput per process went from 1.37–1.39 to 1.58–1.61 conversions/s (docx/xlsx). Conversions that do not run
the JS engine (→ odt/ods/odp, → own format) are unchanged within noise, as expected. n = 5 per cell, single run of
the script each way: treat ±30 ms as noise. Large files are dominated by JS layout (PKT-0041) and gain the same
absolute ≈ 0.1 s only.

## Proof of equality

`python3 .theseus/oracle/x2t/corpus.py run --corpus <templates/en-US> --corpus <make-corpus.py out dir named corpus>`
with snapshots in place, diffed against `.theseus/oracle/x2t/baseline-9.3.7-1.json` (made without snapshots):
**`equal`** (exit 0). Output sizes in convert-large are identical too.

## Surprises / risks

- The sdk-all.bin files on the VM (owner `ds`, 21:44) were created by an earlier attempt of this packet, not by the
  package: 9.3.7-1 does not ship them. A fresh install gets none of this gain.
- A snapshot is bound to the exact x2t/V8 build and sdk-all.js; after an upgrade a stale `.bin` must be rebuilt or
  removed. It must be owned by `ds` (cf. the code cache regenerated as root in PKT-0041).
- Gain (≈ 0.1 s) is below the plan's estimate (−0.3…0.6 s): the rest of the fixed cost is JS warm-up inside the
  first Execute, which only a persistent renderer removes.

## Recommendation

1. Generate snapshots at install/upgrade time (follow-up request in `.theseus/spawn/`, packaging repo).
2. Leave the persistent doctrenderer for a dedicated diagnosis once a core fork exists.
