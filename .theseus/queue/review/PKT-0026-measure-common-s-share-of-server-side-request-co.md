---
id: PKT-0026
title: Measure Common's share of server-side request cost
type: investigate
priority: medium
module: common
origin:
  type: plan
  ref: plan:common:dcb03039:P1
depends_on: []
target:
  files:
  - .theseus/oracle/baseline.md
  create_in:
  - .theseus/oracle/perf
context:
  cards:
  - common
  references:
  - .theseus/diagnosis/DIAG-common.md
contract:
  preserve:
  - Existing tests keep passing unchanged
  forbidden: []
allowed_commands:
- '*'
acceptance:
  commands: []
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
---

## Goal
Profile DocService under the PKT-0018 load test (load-coedit.js 50x5) and during a ConvertService run (e2e-convert.js) with node --cpu-prof. Report the share of DocService CPU and wall time spent in Common/ (operationContext/tenant config, storage-base, taskqueueRabbitMQ, utils, logger) and add it to baseline.md.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-common.md` (row `P1`).
The baseline has measured the server as a whole (receive → broadcast 4 ms p50, 0.28 core at 1 771 broadcasts/s; conversion overhead 55–95 ms) but has never isolated Common. The native package is installed (adapter/environment.md). This measurement decides whether DIAG-common stays keep.

## Suggested plan

## Executor log
- Result (baseline.md, section "Common's share of DocService CPU"): Common's own code is 3–4 % of DocService CPU,
  15–25 % inclusive of what it calls, ≈ 0.01 core / ≈ 1 % of wall time under load-coedit 50 × 5; ≈ 4.6 ms CPU per
  conversion against 125–1 000 ms end to end. Supports DIAG-common's keep verdict.
- Decision: profiled DocService **from this repo's source** with Node 22, same env/config as the systemd unit. The
  packaged `docservice` (pkg) ignores NODE_OPTIONS (a `--require` preload never ran; SIGUSR2 killed it). Load latency
  matched PKT-0018, so the source run is representative.
- Decision: windowed profiling (`perf/profile-toggle.js`, inspector Profiler started/stopped by SIGUSR2) instead of
  plain `--cpu-prof`: the latter covers startup, where module loading dominates (an idle 12 s profile was 48 % "Common"
  from requiring storage-s3/az), and writes only on clean exit.
- Decision: ConvertService driven by `convert-large.js` on the en-US `new.*` templates, not `e2e-convert.js`: the latter
  sends no JWT (written for the Docker image with JWT off) and is outside my target.
- Surprise: log4js was still at DEBUG on this VM (left by PKT-0018). Measured both DEBUG and WARN; DEBUG adds ≈ 50 %
  DocService CPU under co-edit load, all in the log4js/console appenders. Restored DEBUG and the packaged docservice
  afterwards (healthcheck true).
- Surprise: the biggest Common entry points are I/O wrappers (`utils.fillResponse` writing the HTTP reply,
  `utils.postRequestPromise` for save callbacks), not tenant config or storage-base.
- Not done: wall-time attribution per async request (CPU profile only gives CPU; "of wall" = Common CPU / window).
  Raw .cpuprofile files (tens of MB) left in /tmp/prof, not committed. Acceptance list is empty; no tests touched.
- No follow-up spawned: nothing in Common warrants work on performance grounds.

## Spawned packets

## Review

## Lessons for the Atlas
