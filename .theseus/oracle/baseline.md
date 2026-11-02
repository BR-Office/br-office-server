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

## Client (browser editors): measured (PKT-0014)

Script: `node .theseus/oracle/perf/client-perf.js [runs]` against the full stack in Docker
(`ghcr.io/euro-office/documentserver:latest`, client build 9.3.7). It must be started with
`-e JWT_ENABLED=false -e EXAMPLE_ENABLED=true -e ALLOW_PRIVATE_IP_ADDRESS=true`: without the last flag the
server's SSRF guard refuses to download from the example on localhost and the document never loads.
Headless Chromium (Playwright), document editor (docx), new empty document from the example, two users in
separate browser contexts. 2-CPU VM, 2026-11-02, 5 runs (open) / 100 keystrokes / 25 remote edits.

| Scenario | Measured from → to | p50 | p90 | min–max |
|---|---|---|---|---|
| **Open + render** (first user, new docx) | `goto(editor)` → `editor.isDocumentLoadComplete` | 3.15 s | 3.84 s | 2.87–3.84 s |
| **Join co-edit** (second user, same doc) | `goto` → load complete | 3.51 s | 3.69 s | 2.97–3.69 s |
| **Typing latency** (local) | key press → char in sdkjs model → next animation frame | 31 ms | 68 ms | 14–119 ms |
| **Remote change applied** (fast co-edit) | A types → text present in B's model | 101 ms | 361 ms | 73–793 ms |
| **Memory** (JS heap, editor iframe, after edits) | `performance.memory.usedJSHeapSize` | 73 MB | — | 73–78 MB |

A second 3-run pass gave remote apply p50 90 ms / p90 233 ms and the same heap, so the order of magnitude is stable.

Reading:
- **Open** is dominated by the client: loading and parsing the sdkjs/web-apps bundles and fonts plus
  rendering (≈3 s), against server hot paths in the micro-second range and an x2t conversion of an
  empty docx. Not split further here (see gaps).
- **Remote apply** p50 ≈ 0.1 s includes A's client batching, Socket.IO, DocsCoServer, B's apply. The
  server per-message cost measured above (≈60 µs) is < 0.1 % of it; the tail (p90 0.2–0.4 s) needs a
  breakdown before blaming any component.
- **Typing** is client-only and already below the ~50 ms perception threshold at p50.
- These are a lower bound on content cost: an empty document. Large documents, xlsx/pptx and a real
  network are not covered.

## Client: open and co-edit breakdown on realistic documents (PKT-0016)

Script: `node .theseus/oracle/perf/client-breakdown.js <dir> [runs]`; raw output (one JSON line per file) in
`perf/client-breakdown-2026-11-02.json`. **Native package** `euro-office-documentserver` 9.3.7-1 (not Docker),
example on port 80, JWT on, `allowPrivateIPAddress` on, same VM (2 CPUs) for server and Chromium.
Samples generated with python-docx/openpyxl/python-pptx (text, headings, tables; no images):
docx 10 pages (41 KB) and 100 pages (79 KB), xlsx 10 000 rows × 5 columns with formulas (432 KB), pptx 50 slides (76 KB).
3 opens per file, each in a new browser context (cold HTTP cache).

Open, p50 (max) in ms from `goto`, from the editor frame's Performance API resource timings:

| File | Total | Last sdkjs/web-apps script in | Editor.bin requested | Editor.bin received | After Editor.bin → load complete |
|---|---|---|---|---|---|
| docx 10 p | 3 392 (3 727) | 1 526 | 1 493 | 1 563 | 1 860 |
| docx 100 p | 4 168 (4 287) | 1 515 | 1 676 | 1 893 | 2 394 |
| xlsx 10 k rows | 4 383 (4 665) | 2 304 | 2 452 | 2 930 | 1 453 |
| pptx 50 slides | 3 945 (4 545) | 1 860 | 1 601 | 1 648 | 2 271 |

Each open loads 12–13 scripts (~500 KB transferred), 14–25 font files and ~25 other resources.

Co-edit (docx, 2 users, 30 sequential markers of 4–5 characters typed by A; A's WebSocket send and B's
WebSocket message of `saveChanges` timestamped in the page with the host clock):

| File | Total p50 / p90 / max | A: last key → change sent | Wire: A sent → B received (Socket.IO + DocsCoServer) | B: received → marker in model |
|---|---|---|---|---|
| docx 10 p | 116 / 182 / 195 | 6 / 38 / 42 | 6 / 9 / 15 | 42 / 143 / 155 |
| docx 100 p | 137 / 223 / 280 | 31 / 42 / 50 | 8 / 15 / 20 | 73 / 105 / 187 |

Total also includes typing the marker (~20 ms per run of `keyboard.type`). Typing (key → char in model →
next frame): p50 75 ms / p90 119 ms (10 p), p50 80 / p90 156 ms (100 p).

Reading:
- **Open ≈ 3.4–4.4 s and grows mostly in the client.** ~1.5 s goes to the editor scripts (2.3 s for the
  spreadsheet editor); the server's open (auth, x2t conversion, Editor.bin) overlaps with the script
  load and Editor.bin itself arrives in 0.05–0.5 s (largest for xlsx). The biggest single part is
  **after Editor.bin: 1.5–2.4 s** of parse, font loading and layout/first render, and it grows with
  document size (docx 10 → 100 pages: +0.5 s).
- **The remote-apply tail is client-side, not the server.** The wire share (A send → B receive, including
  DocsCoServer) is 6–8 ms p50 and ≤ 20 ms max; A's change batching is ≤ 50 ms; the tail is B applying
  the change and recalculating (p90 105–143 ms, max 187 ms), larger on the big document. The 1–2.4 s
  p99 seen in PKT-0015 with 4 clients is therefore most likely CPU contention among Chromium instances.
- Not isolated: x2t time inside the open (it overlaps with script loading); images, real networks.

## End-to-end server (full stack, PKT-0015)

Environment: `ghcr.io/euro-office/documentserver:latest` (DocService 9.3.7 build 37, PostgreSQL, Redis,
RabbitMQ, FileConverter/x2t in one container), cloud VM with 2 CPUs and 7 GB RAM, measured 2026-11-02.
Absolute numbers are a lower bound for production hardware; the proportions are the point.
Samples: the image's own `en-US/new.{docx,xlsx,pptx,pdf}` templates (6–35 kB, copied from the container at run time, see the header of `perf/e2e-convert.js`).
**Small, near-empty documents only**: these numbers are fixed per-request costs, not content costs.

Runtime configuration needed (container `local.json`, not source code):
`services.CoAuthoring.request-filtering-agent.allowPrivateIPAddress: true`, otherwise every download from a
private address (the bench file server, the example's own callback) fails with ConvertService `error: -4`.
The editors must be opened through the container's bridge IP (port 80), not `127.0.0.1:8080`: the example
builds the save-callback URLs from the browser's host, so through `:8080` the save fails with `ECONNREFUSED`.

### ConvertService (`perf/e2e-convert.js`, 20 conversions per pair, async mode polled every 50 ms)

| Conversion | p50 (1 client) | p99 (1 client) | throughput 1 client | p50 (4 parallel) | p99 (4 parallel) | throughput 4 parallel | raw x2t p50 (loop below) |
|---|---|---|---|---|---|---|---|
| docx → pdf | 767 ms | 873 ms | 1.3 /s | 1 880 ms | 2 253 ms | 1.85 /s | 647 ms |
| docx → odt | 138 ms | 163 ms | 7.3 /s | 238 ms | 324 ms | 14.2 /s | 80 ms |
| xlsx → pdf | 758 ms | 995 ms | 1.3 /s | 1 711 ms | 2 141 ms | 2.1 /s | 723 ms |
| xlsx → ods | 137 ms | 158 ms | 7.3 /s | 243 ms | 422 ms | 13.5 /s | 67 ms |
| pptx → pdf | 1 169 ms | 1 350 ms | 0.9 /s | 2 899 ms | 3 803 ms | 1.2 /s | 1 013 ms |
| pptx → odp | 175 ms | 210 ms | 5.9 /s | 258 ms | 323 ms | 12.9 /s | 81 ms |
| pdf → docx | 136 ms | 148 ms | 7.3 /s | 195 ms | 261 ms | 15.6 /s | 66 ms |

(p99 over 20 samples = the maximum; 0 errors in 280 conversions. Download of the result adds ≈ 1 ms.)

Raw x2t (no DocService/RabbitMQ), 5 runs per pair, inside the container:

```sh
docker exec eo sh -c 'cd /var/www/euro-office/documentserver/server/FileConverter/bin; T=/var/www/euro-office/documentserver/document-templates/new/en-US
for p in docx:pdf docx:odt xlsx:pdf xlsx:ods pptx:pdf pptx:odp pdf:docx; do f=${p%:*}; t=${p#*:}; all=""
 for i in 1 2 3 4 5; do s=$(date +%s%N); ./x2t $T/new.$f /tmp/o.$t >/dev/null 2>&1; all="$all $(( ($(date +%s%N)-s)/1000000 ))"; done
 echo "$f->$t ms:$all"; done'
```

Reading:
- **x2t is the cost.** Service overhead (HTTP, Redis/PostgreSQL task row, RabbitMQ round trip, storage, and up to
  50 ms of our own polling) is ≈ 55–95 ms per conversion; x2t is 70–90 % of every PDF conversion.
- **Anything → PDF costs ~0.6–1 s even for an empty document** (pdf rendering path through DoctRenderer/sdkjs),
  against ~70 ms for the ODF formats: an order of magnitude, worth a look in `core`.
- **Throughput is CPU-bound**: 4 parallel requests only give 1.4× (PDF) to 2× (ODF) on 2 CPUs, and latency
  rises accordingly — no queueing pathology visible, the converter simply saturates the cores.
- **Sync mode (`async: false`) answers in whole seconds** (1 012 ms, 2 016 ms…): DocService polls the task
  status every ~1 s internally, so a 140 ms conversion is reported to sync callers after ≥ 1 s. Integrations
  that call ConvertService synchronously pay up to +900 ms per request. Cause: `CONVERT_ASYNC_DELAY = 1000` with `utils.sleep`
  in `DocService/sources/converterservice.js:49,163`. Candidate improvement (not touched here, no spawn filed
  to stay within the file budget; see the packet log).

### Upstream defect / crash rate: NOT MEASURED

The Goal asks for it, but it could not be measured in this run: `gh api repos/Euro-Office/server` and WebFetch of
github.com/Euro-Office/server were both refused by the executor's permissions, and the local git history starts
on 2026-10-28 (see "Defect history" below). It needs a run with GitHub read access: spawn request
`PKT-0015-defect-and-crash-rate-from-upstream-history`.

### Open, co-edit round trip, save (`perf/e2e-coedit.js`, headless Chromium through the example)

| Operation | What is timed | 2 clients p50 | 2 clients p99 | 4 clients p50 | 4 clients p99 |
|---|---|---|---|---|---|
| Open (first user, new docx) | `goto` → editor load complete (includes x2t docx→internal) | 2.78 s | 2.96 s | 2.72 s | 2.75 s |
| Join (other users, same doc) | `goto` → load complete | 2.83 s | 3.37 s | 3.14 s | 3.33 s |
| Co-edit round trip | A types a marker → present in every other client's model | 99 ms | 1 110 ms | 105 ms | 2 442 ms |
| Save after close | last client closes → saved file in the example storage (callback status 2) | 5.89 s | 6.04 s | 6.22 s | 6.35 s |

Samples: 2 clients 5 runs × 20 edits (100 round trips); 4 clients 3 runs × 20 edits × 3 receivers (180).
Edits are sequential (one marker, wait for all receivers, 300 ms pause), so this is latency, not a load test.

Reading:
- **Round trip p50 ≈ 0.1 s, unchanged from 2 to 4 clients**; the server's per-message cost (≈ 60 µs, micro-benchmarks
  above) is < 0.1 % of it. The **tail grows with clients** (p99 1.1 s → 2.4 s). With 4 Chromium instances
  on 2 CPUs the receivers are CPU-starved, so the tail is probably client/host contention and the sdkjs
  change-batching interval, not DocsCoServer — but this run does not prove it; it needs a server-side
  timestamp per message (receive → broadcast) to split.
- **Save ≈ 6 s is almost all configured delay**: `services.CoAuthoring.server.savetimeoutdelay` = 5 000 ms after
  the last user leaves, then ≈ 0.9–1.3 s of assembling changes (x2t) + callback + example download.
- **Open ≈ 2.8 s is the client** (bundles, fonts, render); the server part (x2t docx → internal format ≈ 80 ms
  raw, by analogy with the ODF rows) is a few percent.

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
| End-to-end server latency (open, co-edit round trip, save, convert) with DB + Redis + RabbitMQ + x2t | measured in PKT-0015 (section above), small documents only; not measured: large documents, a load test (many documents × many clients), server-side split of the co-edit tail | requested: spawn "Split co-edit round-trip tail and load-test the server" |
| Client latency: x2t share of open, real network, low-end clients | PKT-0016 split open and remote apply (section above), but the server's open + x2t is not isolated from the client's lazy script loads, all timings are on localhost, and 2 CPUs host server and browsers | server-side timestamps per open (DocService log: open request → Editor.bin ready) |
| x2t conversion time per format | measured in PKT-0015 for empty docx/xlsx/pptx/pdf → pdf/ODF; not for realistic files | part of the spawn above |
| Crash and defect rate | history too short here; upstream query (`gh api` on Euro-Office/server) refused by the executor's permissions in PKT-0015; no production telemetry | requested: spawn "Defect and crash rate from upstream history" |
| Unit oracle pass/fail and duration | command refused by permissions in this run | rerun `quality.sh` |
