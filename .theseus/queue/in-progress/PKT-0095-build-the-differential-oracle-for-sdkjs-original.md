---
id: PKT-0095
title: 'Build the differential oracle for sdkjs: original against new'
type: characterize
priority: critical
module: sdkjs-word
origin:
  type: plan
  ref: differential:sdkjs
depends_on: []
target:
  files: []
  create_in:
  - .theseus/oracle/differential
  - .theseus/oracle/perf
context:
  cards: []
  references:
  - .theseus/oracle/baseline.md
  - .theseus/adapter/environment.md
contract:
  preserve:
  - 'No change to the code of sdkjs: this packet only builds the oracle'
  forbidden: []
allowed_commands:
- '*'
requires:
- documentserver
- browser
acceptance:
  commands:
  - bash .theseus/oracle/differential/sdkjs-word.sh
  - bash .theseus/oracle/differential/sdkjs-common.sh
budget:
  max_files_changed: 8
  max_diff_lines: 1500
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: null
resume: false
---

## Goal
Write `.theseus/oracle/differential/sdkjs-word.sh`, `.theseus/oracle/differential/sdkjs-common.sh`: each compares the original code of sdkjs (`external/sdkjs.base`, the upstream code the fork was made from) with the new code (`external/sdkjs`, the packet's branch with every change already merged into the fork) on the same inputs, as users meet them: open documents of each kind the module handles, apply scripted local edits and scripted remote (co-editing) changes, save, reopen, convert. It fails when the results differ (the saved document, what is shown, what is sent to other users), unless the difference is listed as intended in a file next to the script, and prints one timing line per case for both sides (original and new) so a reviewer sees the gain. Build each side where it can run for real (the editor in the browser against the running server; see `.theseus/adapter/environment.md`), caching builds by commit in `$THESEUS_CACHE_DIR`. It must pass now, with the changes already merged.

## Essential context
- Planned by `theseus plan` because the modules sdkjs-word, sdkjs-common change sdkjs through a fork and have no differential oracle. The factory runs `.theseus/oracle/differential/<module>.sh` last in the acceptance of every packet of these modules, and shows its output to the reviewer.
- `.theseus/oracle/baseline.md` records how earlier packets built and measured this code (for the editor: the webpack persistent cache must be cleared between builds).

## Suggested plan

## Executor log
- return: container restarted; factory restarted on Theseus 0.21.2, work kept (TEP-0010)
- attempt 2 (claude-opus-5-5): the kept work (build.sh, run.cjs, gen-inputs.py, two scripts, two .intended files) existed but FAILED: 12 differences in sdkjs-word, all noise, because the sdkjs changes (font-check of remote changes, style cache, shape cache) do not change results. Fixes:
  - Text and bold go through the API (`asc_enterText`, `put_TextPrBold`) instead of `keyboard.type` + Ctrl+B. Typed keys raced with shortcuts and autocorrect ("bold" lost, "Second" capitalized on one side).
  - Each step waits for `AscCommon.CollaborativeEditing.Get_GlobalLock()` to clear. In co-editing every action waits for the server's lock answer, and input sent meanwhile is dropped silently. This was the main source of the lost text.
  - Sent changes are flattened across messages (how they are batched depends on timing). The last 4 bytes of TableId registration records (the random ParaId, `CreateDurableId`) are masked. `Math.random` is also seeded per user, but the number of calls depends on timing, so the seed alone was not enough.
  - The `shown` hash waits for two equal reads with the cursor hidden (`TargetEnd`).
  - Slides: B's page switch and its selection are separate steps (in one tick the selection missed). Both users leave text editing and B closes before A saves: a held edit lock blocked A's download for 60 s.
  - New guard: the expected edit strings must be in the settled model on each side, or the case errors. It found that chart.pptx had been passing with no local edit (A selected the chart, not a text shape) and that B's slide edit had not landed. Both are fixed.
  - build.sh builds the `min` and `all` chunk configs one at a time (`--config-name`) with `--max-old-space-size=3072`. If a minified chunk is still OOM-killed, it rebuilds that chunk with `--no-optimization-minimize` and records it in `<out>/<module>/unminified`, which the scripts print. Reason: the shell's memory cgroup (6.27 GB) is shared with the other agents' shells; the slide build was killed 5 times while another packet compiled x2t. In the final runs everything was minified and no fallback was used.
- Proof: both differential scripts PASS twice in a row, and `.theseus/oracle/sdkjs-word.sh` (42/42) and `.theseus/oracle/sdkjs-common.sh` (6/6) pass. Mutation check: a bundle copy where asc_enterText turns 'n' into 'N' gives DIFF in model, sentA, shown, reopened and converted (sentB same, since B types no 'n'); exit 1.
- Not done: no remote-change case on a chart object itself (charts are opened, shown, saved, converted and reopened, but only text is edited). `.intended` files are empty: no intended difference yet.
- Timing: the timing lines show no measurable gain on these small inputs (open about 4.3 s, edit about 3 s on both sides); the noise is of the same order.
- attempt 3 (claude-opus-5-5): rejected for R2: `external/sdkjs/.theseus-addons/sdkjs-forms` had been committed in the fork as a gitlink (the base oracle `.theseus/oracle/sdkjs-word.sh` clones sdkjs-forms there; the factory's commit of leftovers picked up the nested repo). Fix: reverted that commit in external/sdkjs (net diff of the fork branch for this packet is now empty), added `/.theseus-addons/` to the checkout's local `info/exclude`, and build.sh now adds that exclude itself on every run so it cannot recur. All four acceptance commands pass (differential word 2 cases, common 3 cases; 42/42 and 6/6 suites).

## Spawned packets

## Review

## Lessons for the Atlas
- Driving the editor in co-editing: wait for `CollaborativeEditing.Get_GlobalLock()` to clear after every action, or input is dropped without an error. Use API calls, not timed keystrokes.
- Paragraph ParaIds are random (`CreateDurableId`): change streams and saved files differ by those bytes between any two runs.
- The bash memory cgroup is shared between concurrent agents: a full sdkjs slide webpack build (two chunk configs in one process) does not fit next to an x2t compile.
- Oracles that clone nested repos inside a fork checkout must exclude them locally (info/exclude), or the factory commits them as gitlinks outside the target.
- A differential oracle needs a check that its scripted edits landed. Without it, "same" passed with no edit on both sides.
