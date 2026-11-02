---
goals_hash: dcb03039
packet: PKT-0013
date: 2026-11-02
machine: sandbox, Linux 6.18, Node v22.23.4 (single run, numbers are indicative ±20%)
---

# Performance baseline

## Where users feel it

| Scenario | What the user waits for | Where it runs | Repository |
|---|---|---|---|
| **Open** | document appears in the browser | server: DocService (auth, `canvasservice.js`, cache lookup) → FileConverter (`x2t`, C++ binary) → client: sdkjs loads `Editor.bin` and renders | server: this repo; x2t: `core` (C++, not here); rendering: `sdkjs` / `web-apps` (not here) |
| **Co-edit** | others' changes and lock answers appear | server: `DocsCoServer.js` (Socket.IO, locks, change storage in DB, pub/sub via Redis/RabbitMQ); client: sdkjs applies changes | this repo + `sdkjs` |
| **Save** | "saved" / callback to the integrator | server: DocsCoServer → convert changes with x2t → storage → callback | this repo + `core` |
| **Convert** | ConvertService response | server: `converterservice.js` → queue → FileConverter → x2t | this repo + `core` |

Most of the CPU in open / save / convert is in **x2t (C++)** and the **client (sdkjs, JavaScript in the browser)**,
neither of which is in this repository. The Node.js server is mostly coordination: I/O, queues, JSON,
locks. Its own cost matters most for **co-edit latency and throughput** (per-message work in `DocsCoServer.js`).

## Speed: what can be measured here today

Script: `node .theseus/oracle/perf/bench-hotpaths.js` (from the repository root; no DB/Redis/RabbitMQ needed,
uses the in-memory editor data). Micro-benchmarks of per-action server hot paths:

| Benchmark | Scenario | p50 | p99 | Throughput (1 core) |
|---|---|---|---|---|
| `coedit.parse+stringify(50 changes)` | co-edit, per `saveChanges` message | 60.5 µs | 184.6 µs | ~14 000 msg/s |
| `coedit.locks add/get/remove` (`editorDataMemory`) | co-edit, lock round trip | 4.5 µs | 22.5 µs | ~159 000 op/s |
| `coedit.addMessage` (`editorDataMemory`) | co-edit, message queue | 0.44 µs | 1.85 µs | ~1.8 M msg/s |
| `open.formatBySignature(pdf)` (`formatchecker`) | open / convert | 0.92 µs | 5.4 µs | ~760 000 op/s |
| `open.formatBySignature(zip)` | open / convert | 0.91 µs | 2.1 µs | ~860 000 op/s |
| `open.formatFromString` | open / convert | 0.22 µs | 0.67 µs | ~3.8 M op/s |

Reading: JSON handling of change batches is the dominant in-process cost found so far (≈ 60 µs per 50-change
message), two orders of magnitude above lock or format-detection work. All are far below network,
database and x2t latencies (milliseconds to seconds), so **a language change of these paths alone would not
be felt by users**; the end-to-end numbers below are needed before any such decision.

## Quality: what can be measured here today

Script: `sh .theseus/oracle/perf/quality.sh` (from the repository root).

- **Unit oracle** (`.theseus/oracle/unit.sh`): not run in this packet, the executor's permissions refused it
  (see the packet log). The factory runs it as `integrate_check`; its last result is the reference.
- **Defect history**: git history here starts on 2026-10-28 (89 commits, restart from upstream). Only 3
  commits in it match `fix|bug|crash|regress`, all touching tests/tooling. **Not usable as a defect rate**;
  the upstream history (`github.com/Euro-Office/server`, and ONLYOFFICE before it) is needed.
- **Structural risk** (what makes defects likely), from size alone: `DocsCoServer.js` 4 736 lines,
  `canvasservice.js` 2 106, `utils.js` 1 563, `wopiClient.js` 1 250, `commondefines.js` 1 245. Co-edit
  coordination concentrated in one 4.7 k-line file is the main structural hotspot.

## Gaps (not measured, and why)

| Gap | Why | Follow-up |
|---|---|---|
| End-to-end server latency (open, co-edit round trip, save, convert) with DB + Redis + RabbitMQ + x2t | needs the full stack running; x2t binaries are not in this repo; RabbitMQ is not installed here | requested: spawn "Measure end-to-end server latency" |
| Client latency (open/render, apply remote changes, typing) | lives in `sdkjs` / `web-apps`, not in this repository | requested: spawn "Measure client-side performance" |
| x2t conversion time per format | C++ in `core`, not here | part of the end-to-end request |
| Crash and defect rate | history too short here; no production telemetry | part of the end-to-end request (upstream history) |
| Unit oracle pass/fail and duration | command refused by permissions in this run | rerun `quality.sh` |
