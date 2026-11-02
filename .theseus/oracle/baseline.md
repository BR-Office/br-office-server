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

### Upstream defect / crash rate (PKT-0017)

Script: `node .theseus/oracle/perf/defect-history.js git <bare.git> <name>` (fix/crash commits) and
`node .theseus/oracle/perf/defect-history.js issues` (issue counts). Sources, 2026-11-02:
blob-less `git clone --bare` of github.com/Euro-Office/server (default branch `main`) and ONLYOFFICE/server;
issue counts from the GitHub **search** API (`/search/issues`; the per-repo API and `gh api` are blocked
in the factory). ONLYOFFICE/server has issues disabled: its issues are in ONLYOFFICE/DocumentServer, which
covers the **whole product** (editors, converter, server), so it is an upper bound for the server.

Rules (quoted from the script): fix = subject matches
`/\b(fix(e[sd])?|fixing|bugfix|hotfix|bug\s*#?\d+|regression)\b/i`; crash = subject contains `crash`, or
fix and `/\b(crash\w*|segfault|unhandled|uncaught|oom|out of memory|hang\w*|deadlock|exit code|process exit|restart\w*)\b/i`.
Merges excluded; commits with the same date + subject counted once (Euro-Office `main` has **1 828 duplicates**
from a rebase of the upstream history: without dedup the counts nearly double). Issue crash = text matches
`crash OR crashes OR hang OR "out of memory"`.

**Fix commits per year** (Euro-Office `main` = ONLYOFFICE history up to the fork + Euro-Office work)

| year | EO commits | EO fix | EO fix % | EO crash | OO commits | OO fix | OO fix % | OO crash |
|---|---|---|---|---|---|---|---|---|
| 2013–2017 | 893 | 52 | 6 | 1 | 885 | 52 | 6 | 1 |
| 2018 | 129 | 29 | 22 | 1 | 127 | 29 | 23 | 1 |
| 2019 | 107 | 30 | 28 | 0 | 104 | 29 | 28 | 0 |
| 2020 | 207 | 102 | 49 | 0 | 199 | 97 | 49 | 0 |
| 2021 | 152 | 65 | 43 | 1 | 148 | 64 | 43 | 1 |
| 2022 | 150 | 60 | 40 | 5 | 145 | 55 | 38 | 5 |
| 2023 | 194 | 83 | 43 | 4 | 176 | 76 | 43 | 4 |
| 2024 | 224 | 123 | 55 | 5 | 211 | 119 | 56 | 5 |
| 2025 | 402 | 218 | 54 | 4 | 287 | 139 | 48 | 4 |
| 2026 (to 10-28 / 10-15) | 84 | 32 | 38 | 0 | 212 | 119 | 56 | 2 |
| **total** | 2 542 | 794 | 31 | 21 | 2 494 | 779 | 31 | 23 |

Euro-Office per month, last 12 with commits: 2025-11 6/13 fix, 12 4/9, 2026-01 5/11, 02 5/17, 03 1/9,
05 5/8, 06 4/10, 08 0/1, 09 0/1, 10 12/27; crash-related 1 each in 2025-11 and 2025-12, none since.
The low fix share before 2018 reflects commit-message habits (no `[bug]`/`Fix bug N` convention), not quality.

**Bug and crash issues**

| Tracker | Period | Issues | Bug-labelled | Crash/hang |
|---|---|---|---|---|
| ONLYOFFICE/DocumentServer (whole product), label `confirmed-bug` | 2022 / 2023 / 2024 / 2025 / 2026 | 426 / 391 / 478 / 432 / 293 | 163 / 151 / 200 / 202 / 147 (38→50 %) | 15 / 13 / 6 / 12 / 19 |
| Euro-Office/server, label `bug` | 2026-01 … 2026-11 (first issue 2026-01-07) | 14 | 4 (Jan 1, Jun 1, Aug 2) | 2 (Aug) |
| Euro-Office/DocumentServer (product), label `bug` | 2026-02 … 2026-11 | 276 (peak Jun: 86) | 61 (Jun 20, Aug 15, Sep 8) | 27 |

Full yearly (2016–2026) and monthly tables: run the script; they are not repeated here.

**Where fixes concentrate** (Euro-Office `main`, fix commits / all commits touching the file):

| File / module | fix | commits | crash |
|---|---|---|---|
| `DocService/` (module) | 421 | 1 115 | 13 |
| `Common/` (module) | 259 | 904 | 4 |
| `FileConverter/` (module) | 71 | 259 | 5 |
| `DocService/sources/DocsCoServer.js` | 197 | 562 | 7 |
| `DocService/sources/canvasservice.js` | 131 | 318 | 5 |
| `Common/config/default.json` | 79 | 322 | 1 |
| `Common/sources/utils.js` | 66 | 203 | 2 |
| `DocService/sources/wopiClient.js` | 64 | 130 | 1 |
| `FileConverter/sources/converter.js` | 61 | 217 | 5 |
| `DocService/sources/server.js` | 35 | 178 | 3 |

Crash fixes (21 on EO `main`) are almost all **null/undefined guards and unhandled errors in Node**
(undefined user name, permissions, tenant, connection; forcesave after close; socket error on client disconnect
2025-12; `getJwtHsKey` 2025-11), clustered in `DocsCoServer.js`, `canvasservice.js` and `converter.js`.

Reading:
- About **half of all server commits since 2020 are fixes** (40–56 % per year); about **4–5 crash fixes a
  year**, concentrated in the same three files that dominate fixes overall. `DocsCoServer.js` (4.7 k lines,
  the structural hotspot below) gets a quarter of all fix commits.
- **Finding:** two 2026 ONLYOFFICE crash/hang fixes are **not on Euro-Office `main`**: "Handle client
  disconnect during file streaming to prevent process crash; Fix bug 81132" (2026-04-16; present only on
  Euro-Office side branches such as `release/v9.4.0`) and "Release SaveVersion after a failed final assembly
  so prepare4shutdown no longer hangs; Fix bug 81576" (2026-07-13; absent from every Euro-Office ref, by bug
  number). Whether to port them is a decision for the humans.
- No production crash telemetry exists; these are **fixed** defects, a proxy for the defect rate, not the
  crash rate users see.

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

### Co-edit tail split, load test, large files (PKT-0018, native package 9.3.7-1, 2-CPU VM)

Raw numbers: `perf/results-2026-11-02.json`. Scripts: `perf/coedit-split.js`, `perf/load-coedit.js`, `perf/convert-large.js`.
Server-side timestamps come from DocService DEBUG logs (log4js level DEBUG, config only, no source change).

**Co-edit round trip split** (`coedit-split.js`, headless Chromium, new docx, ms):

| Segment | 2 clients p50 / p99 | 4 clients p50 / p99 |
|---|---|---|
| total (type → marker in receiver model) | 101 / 294 | 126 / 2 066 |
| type (sender keystroke → WebSocket send) | 46 / 120 | 48 / 1 843 |
| up (send → DocService receive) | 1 / 21 | 1 / 22 |
| **server (receive → broadcast)** | **4 / 69** | **4 / 57** |
| down (broadcast → receiver WebSocket event) | 1 / 198 | 1 / 924 |
| apply (receiver event → marker in model) | 47 / 165 | 58 / 169 |

Host CPU was ≈ 99 % busy throughout; Chromium took 46–76 % of CPU time, DocService 3–7 %.
**Verdict: the tail is the clients, not DocsCoServer.** The server segment stays ≤ 70 ms p99 and does not grow
with clients; the 4-client tail is in the sender's main thread (sdkjs batching/CPU) and the receiver being
scheduled (`down`), i.e. CPU starvation of the browsers on 2 CPUs. 17/60 (2 clients) edits were sent in
more than one batch.

**Load test** (`load-coedit.js`, raw Socket.IO clients, 2 changes/s per document, 30 s, ms):

| Docs × clients | changes/s | broadcasts/s | ack p50 / p99 / max | broadcast p50 / p99 / max | open p99 | DocService cores |
|---|---|---|---|---|---|---|
| 1 × 2 | 2 | 2 | 4 / 15 / 15 | 4 / 15 / 15 | 1 031 (cold) | 0.02 |
| 10 × 5 | 20 | 79 | 3 / 7 / 10 | 3 / 7 / 10 | 131 | 0.04 |
| 50 × 5 | 98 | 393 | 3 / 12 / 41 | 3 / 12 / 41 | 160 | 0.13 |
| 100 × 10 (port 8000, no nginx) | 197 | 1 771 | 3 / 12 / 32 | 2 / 11 / 32 | 149 | 0.28 |
| 200 × 5 (port 8000, PKT-0021) | 393 | 1 574 | 4 / 28 / 109 | 4 / 27 / 109 | 177 | 0.40 |
| 200 × 10 (port 8000, PKT-0021) | 393 | 3 541 | 5 / 28 / 88 | 5 / 28 / 88 | 159 | 0.54 |

- Latency is flat up to 1 000 sockets and ≈ 1 800 broadcasts/s; DocService used 0.28 of a core, PostgreSQL 0.09.
- 100 × 10 **through nginx** failed with Socket.IO `TransportError`: stock `worker_connections 768` caps the
  proxy at ≈ 700 sockets. A deployment config limit, not a server limit.
- 200 × 5 first hung (PKT-0018); PKT-0021 found **a harness bug, not a server limit**: when a 2nd editor joins,
  DocsCoServer takes an auth lock with a timer (`expire.lockDoc` = 30 s, `setLockDocumentTimer`); the real editor
  releases it with `unLockDocument`, the script did not. Docs are opened one after another, so once the open phase
  passed 30 s the lock holders were dropped and the untimed `saveLock` wait hung. `load-coedit.js` now sends
  `unLockDocument` from the first client after each doc opens and times out `saveLock` waits (10 s, `noLockReply`).
- After the fix (PKT-0021, 2 changes/s/doc, medium-10p.docx): 200 × 5 and 200 × 10 run with no errors and no lost
  broadcasts; PostgreSQL 0.25 core. No ceiling at 2 000 sockets / 3 500 broadcasts/s; p99 rises 12 → 28 ms with the
  doubled change rate. Not pushed higher: the load generator shares the 2 CPUs.
- Save after all clients leave: every save returned callback status 3 (the replayed change does not fit the
  document, so assembly fails); the time `saveAllMs` (6 s for 1 doc, 67 s for 100) is therefore indicative only. Superseded by the valid-save measurement below (PKT-0023).

**Valid saves under load** (PKT-0023, `load-coedit.js replay <docs>`, native 9.3.7-1, 2-CPU VM). Per document: a fresh key
on a pristine copy of the en-US blank template, 1 client, the full change sequence captured from a browser typing
"hello world" (`load-coedit.js capture`; 17 changes in one `saveChanges`), then all sockets close at once.
Assembly = socket close → callback (includes `savetimeoutdelay` 5 s). All docs opened concurrently. ms:

| Docs | callback status | assembly p50 / p90 / max | ack p50 / max | open p50 / p99 |
|---|---|---|---|---|
| 1 | 2 ×1 | 5 719 | 4 / 4 | 126 |
| 10 | 2 ×10 | 7 837 / 9 581 / 9 581 | 10 / 11 | 449 / 608 |
| 50 | 2 ×50 | 16 590 / 25 612 / 27 526 | 38 / 56 | 1 531 / 2 608 |
| 100 | 2 ×100 | 27 998 / 45 544 / 49 282 | 63 / 77 | 2 727 / 5 226 |
| 200 | 2 ×200 | 51 806 / 87 489 / 95 035 | 122 / 165 | 6 283 / 11 538 |

- **Every save is valid** (status 2, 0 lost, 0 lock errors). Why PKT-0021's single change failed: the browser's
  first batch starts with a `64;` change (document/application info) before the first `35;` (add text into run
  `672`); replaying the `35;` alone is what x2t rejected. A second cause, found on the way: the base must be the
  untouched template. The capture's own file is overwritten by the browser's save when it closes, and replaying onto it
  fails again with status 3 (first 1–200 sweep, all status 3, before switching the base).
- **Save assembly is serial**: the last save lands ≈ 5 s + 0.45 s × docs (95 s for 200). That is what
  FileConverter `maxprocesscount` = 1 predicts (one x2t at a time, one RabbitMQ queue shared with conversions). So the
  save backlog after a mass disconnect, not DocService, is the bottleneck: 200 editors leaving together wait up to
  1.5 min for their file. Raising `maxprocesscount` (or more converters) is the lever; not measured here.
- `coresUsed` stays ≈ 0 for all processes: the sampler reads only live processes' own CPU, and the short-lived x2t
  children are not counted. CPU of save assembly is therefore not in these numbers.
- Opens here are concurrent (the co-edit mode opens sequentially), hence open p99 of 11.5 s at 200: the x2t open
  conversions queue on the same single converter.
- Small documents only (blank docx + 11 characters); per-save x2t time grows with document size (see Large files).

**Large files** (`convert-large.js`, PKT-0016 samples, 3 runs, concurrency 1, ms p50):

| File | raw x2t open (→ Editor.bin) | raw → pdf | service → pdf | service → ODF | service → own format (save path) |
|---|---|---|---|---|---|
| medium-10p.docx (40 kB) | 107 | 1 340 | 1 454 | 198 | 128 |
| large-100p.docx (77 kB) | 104 | 3 545 | 3 894 | 268 | 145 |
| large-10k.xlsx (421 kB) | 299 | 6 518 | 6 417 | 3 121 | 213 |
| deck-50.pptx (74 kB) | 113 | 1 955 | 3 057 (max 124 316) | 202 | 136 |

- The open conversion stays ≈ 0.1–0.3 s even on large files: open time is the client, as PKT-0016 found.
- PDF export dominates (1.3–6.5 s, all x2t rendering; DocService overhead ≈ 0.1 s).
- The 124 s pptx → pdf (one in three runs) is explained (PKT-0021): queueing, not x2t. FileConverter
  `maxprocesscount` = 1 and conversions share one RabbitMQ queue with save assembly; this run followed the load test,
  whose 100 failing saves (with retries) were still queued, and deck-50.pptx → pdf were the first conversions. On an
  idle server 10 runs took 1 966–2 789 ms; started right after a 100 × 2 load test: 2 187, 2 386, then 68 662 ms.
  `convert-large.js` now waits for the queue to drain (small probe conversion < 3 s) before timing; run it on an idle
  server or before the load tests.

### Common's share of DocService CPU (PKT-0026, native 9.3.7-1 stack, 2-CPU VM)

Raw numbers: `perf/common-share-2026-11-02.json`. Scripts: `perf/profile-toggle.js` (windowed V8 profiler, started and
stopped with `SIGUSR2`), `perf/profile-common.js` (attribution). **DocService ran from this repository's source** with
Node 22 (`node --require profile-toggle.js sources/server.js`, same env and config as the `ds-docservice` unit): the
packaged `docservice` binary ignores `NODE_OPTIONS`, and `--cpu-prof` alone profiles startup and writes only on a clean
exit. Load numbers matched PKT-0018 (ack / broadcast p50 3 ms, p99 10–12 ms), so the source run is representative.
ConvertService was driven with `convert-large.js` on the en-US `new.*` templates (5 runs × 9 pairs, 45 conversions):
`e2e-convert.js` sends no JWT and the native install has JWT on. Two log levels: DEBUG (what this VM has been
left on since PKT-0018) and WARN (stock).

Self = leaf frame in `Common/sources`. Inclusive = a `Common/sources` frame anywhere on the stack (Common and what it
calls). "+ libs" also counts library code only Common uses (log4js, amqplib, config, aws-sdk…), whose async callbacks
run without a Common frame. Percentages are of DocService busy CPU; "of wall" is of the profiled window.

| Run | DocService cores | Common self | Common inclusive | Common + libs inclusive | Common inclusive, % of wall |
|---|---|---|---|---|---|
| co-edit 50 × 5, WARN | 0.077 | 4.0 % | 14.6 % | 17.3 % | 1.1 % |
| co-edit 50 × 5, DEBUG | 0.115 | 2.6 % | 12.2 % | 38.8 % | 1.4 % |
| ConvertService ×45, WARN | 0.043 | 3.5 % | 25.4 % | 26.8 % | 1.1 % |
| ConvertService ×45, DEBUG | 0.037 | 3.3 % | 29.3 % | 46.5 % | 1.1 % |

Where the inclusive Common time enters (WARN):
- Co-edit: `utils.postRequestPromise` 6.5 % (the save callbacks to the integrator, HTTP via axios),
  `utils.fillJwtForRequest` 1.9 %, `operationContext` (Context, getCfg, initFromConnection) ≈ 2.3 %,
  `storage-base` (getSignedUrls, listObjects → storage-fs) 1.5 %, `taskqueueRabbitMQ` 0.4 %, `logger` 0.5 %.
- ConvertService: `utils.fillResponse` 17.5 % (writing the HTTP response, mostly `writev`/socket: the client polls
  every 50 ms), `utils.checkClientIp` 3.6 %, `taskqueueRabbitMQ` 1.4 %, `tenantManager.getTenantSecret` 0.9 %,
  `operationContext` 0.7 %. ≈ 4.6 ms of Common CPU per conversion (18 ms DocService CPU per conversion in total,
  most of it the 50 ms polls), against 125–1 000 ms end to end: Common is < 4 % of a conversion's latency.

**Verdict.** Common's own code is 3–4 % of DocService CPU; with everything it calls, 15–25 %; in absolute terms
≈ 0.01 core and ≈ 1 % of wall time under the 50 × 5 load. Common is not a performance hotspot: the tenant config
lookups (`operationContext.getCfg`) are ≈ 1 %, storage-base < 2 %, the RabbitMQ task queue < 1.5 %. The one sizeable
Common-related cost is **logging at DEBUG**: it adds ≈ 50 % to DocService CPU under co-edit load (0.077 → 0.115 core;
log4js + console + date-format), all of it in the appenders, not in `Common/sources/logger.js`. These numbers support
DIAG-common's **keep** verdict: there is no performance case for reworking Common.
Note for later measurements: reset the log level to WARN (`/etc/euro-office/documentserver/log4js/production.json`)
or say which level was on.

## Quality: what can be measured here today

Script: `sh .theseus/oracle/perf/quality.sh` (from the repository root).

- **Unit oracle** (`.theseus/oracle/unit.sh`): not run in this packet, the executor's permissions refused it
  (see the packet log). The factory runs it as `integrate_check`; its last result is the reference.
- **Defect history**: git history here starts on 2026-10-28 (89 commits, restart from upstream). Only 3
  commits in it match `fix|bug|crash|regress`, all touching tests/tooling. Not usable; the upstream rate is
  in "Upstream defect / crash rate" above (PKT-0017).
- **Structural risk** (what makes defects likely), from size alone: `DocsCoServer.js` 4 736 lines,
  `canvasservice.js` 2 106, `utils.js` 1 563, `wopiClient.js` 1 250, `commondefines.js` 1 245. Co-edit
  coordination concentrated in one 4.7 k-line file is the main structural hotspot.

## Gaps (not measured, and why)

| Gap | Why | Follow-up |
|---|---|---|
| Load beyond 2 000 sockets; save assembly with more converters or larger documents | valid saves measured to 200 docs (PKT-0023, above): serial at ≈ 0.45 s/doc with `maxprocesscount` 1; not measured with more converter processes, on large documents, or with x2t CPU counted | new packet if the save backlog matters |
| Client latency: x2t share of open, real network, low-end clients | PKT-0016 split open and remote apply (section above), but the server's open + x2t is not isolated from the client's lazy script loads, all timings are on localhost, and 2 CPUs host server and browsers | server-side timestamps per open (DocService log: open request → Editor.bin ready) |
| x2t conversion time per format | measured on realistic files in PKT-0018 (above) | — |
| Crash rate seen by users | upstream fix and issue rates measured (PKT-0017, above); no production crash telemetry; issue counts for ONLYOFFICE cover the whole product, not only the server | production telemetry, if a deployment exists |
| Unit oracle pass/fail and duration | command refused by permissions in this run | rerun `quality.sh` |
