---
id: PKT-0141
title: Map the open-docx-real-internet journey end to end (round 3)
type: measure
role: diagnostician
priority: critical
module: project
origin:
  type: plan
  ref: journey:open-docx-real-internet:dcb03039:r3
depends_on:
- PKT-0135
target:
  files: []
  create_in:
  - .theseus/journeys
  - .theseus/oracle
context:
  cards: []
  references:
  - .theseus/adapter/adapter.yaml
  - .theseus/oracle/baseline.md
  - .theseus/adapter/environment.md
contract:
  preserve:
  - No change to the code of the project or of its forks
  forbidden: []
allowed_commands:
- '*'
exclusive: true
acceptance:
  commands:
  - 'grep -q "^round: 3" .theseus/journeys/open-docx-real-internet.md'
  - 'grep -q "^goals_hash: dcb03039" .theseus/journeys/open-docx-real-internet.md'
  - 'grep -Eq "^total_ms: [0-9]" .theseus/journeys/open-docx-real-internet.md'
  - theseus validate
budget:
  max_files_changed: 8
  max_diff_lines: 2000
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Map the user journey `open-docx-real-internet` (Same as open-docx-real (first open, cold browser cache, until fully rendered), but with the browser on an emulated home internet link (Chrome DevTools network emulation: 50 Mbps down, 10 Mbps up, 30 ms latency), so every byte the client downloads (fonts, scripts, editor bin, images) costs what it costs a real user; the map must attribute each download to the module that asks for it) end to end, as users meet it, against the integrated build: the project's main branch and the forks' collecting branches, not the installed package (which runs the original code). If `.theseus/oracle/serve-integrated.sh` does not exist, write it: it brings that build up and down on this machine. Make `bash .theseus/oracle/journeys/open-docx-real-internet.sh` work: it runs the journey several times against the integrated build and prints one line `total_ms=<p50> min_ms=<min> max_ms=<max> runs=<n>`. Then write `.theseus/journeys/open-docx-real-internet.md` with `goals_hash: dcb03039`, `round: 3` and `total_ms: <p50>` in its header, and a machine-readable ```yaml block: `stages:` (each with `id`, `module` (a module id of the adapter, or `project`), `files`, `functions`, `ms` and `share` in percent) and `unattributed_ms`. Break the journey down from the user's action to the last pixel: every stage the time goes through, in every module, with the files and functions that spend it (a stage above 5% of the total names its functions). The stages and `unattributed_ms` add up to `total_ms` within 5%. Round 3: compare with the earlier map if there is one.

## Essential context
- Planned by `theseus plan` from `goals.journeys` in the adapter. Every module's next diagnosis must cover every stage you give it, so name the module of each stage with the ids of `modules` in the adapter.
- `.theseus/oracle/baseline.md` and `.theseus/oracle/rounds/` hold the measurements made so far: evidence to cite, not a substitute for measuring.

## Suggested plan

## Executor log
- `serve-integrated.sh` existed (PKT-0131/0135); reused. Wrote `open-docx-real-internet.sh` + `-run.cjs` (copy of open-docx-real with CDP network emulation 50/10 Mbps, 30 ms, upload via page fetch so it pays the uplink, per-module download accounting by URL).
- Result: total_ms=6601 (min 6580, max 6895, 5 runs, load 2.0→3.7). Upload is 42 % (2.8 MB over 10 Mbps).
- Decision: the client window is split by the PKT-0043 CPU shares as in PKT-0135 (estimate, not a profile); x2t from the converter log.
- Surprise: the example landing page's preloader downloads ~2.9 MB of web-apps/sdkjs from t=16 ms, overlapping the upload.
- Surprise / not done: CDP reports 0 bytes for Editor.bin and `/cache/files/` media (15 ms bin transfer), likely not throttled; spawned a follow-up request.
- Attempt 2 (rejected: Editor.bin/media not throttled). Cause found: web-apps registers `docserviceworker.js`, whose fetches of Editor.bin, `/cache/files` media and fonts leave the page's emulated link. Fix in the runner: `serviceWorkers: 'block'` + CDP `Network.setBypassServiceWorker`. HTTP cache left on (a test with it off too gave 8375 ms, about the same).
- Decision: Editor.bin and media assigned to sdkjs-common (requested by `common/apiBase.js` / the image loader) in the runner's accounting, the downloads table and the YAML.
- Result: total_ms=8333 (min 7438, max 8560, 5 runs). Editor.bin 25 KB / 71 ms, media 1.07 MB / 261 ms, all on the link. sdkjs-common grows to 12.9 MB (fonts), which was hidden by the worker in attempt 1.
- Surprise: in the CDP clock the Editor.bin request comes before the page's asc_LoadDocument mark; the stages use the Node-clock marks and give the CDP transfer as the bin's network share.
- Not done: x2t not measured again (267 ms reused from attempt 1, same build). The old spawn request (worker accounting) is now resolved, so it became a request to break down the font payload.

## Spawned packets

## Review

## Lessons for the Atlas
