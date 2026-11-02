---
id: PKT-0027
title: Characterize ConvertService sync and async flow in converterservice.js
type: characterize
priority: medium
module: docservice
origin:
  type: plan
  ref: plan:docservice:dcb03039:P1
depends_on: []
target:
  files: []
  create_in:
  - tests/unit
context:
  cards:
  - docservice
  references:
  - .theseus/diagnosis/DIAG-docservice.md
contract:
  preserve:
  - Existing tests keep passing unchanged
  forbidden: []
acceptance:
  commands:
  - .theseus/oracle/unit.sh
  - npm run lint:check
budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.0
  max_attempts: 3
roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
resume: false
---

## Goal
Pin the behaviour of convertJson/convertXml in sync (async=false) and async mode, including the polling loop, timeout (CONVERT_TIMEOUT) and error statuses, with taskResult and the queue mocked.

## Essential context
- Wave 0 of the plan in `.theseus/diagnosis/DIAG-docservice.md` (row `P1`).
The loop is at DocService/sources/converterservice.js:156-170 with CONVERT_ASYNC_DELAY=1000 (line 49). Baseline PKT-0015 shows sync answers in whole seconds.

## Suggested plan

## Executor log
- attempt 1: the executor's permissions refused: Bash: mkdir -p x; head -24 tests/unit/utilsDocService.tests.js > tests/unit/converterService.tests.js; cat >> tests/unit/conve…; Bash: cd tests/unit && python3 - <<'PY'; Bash: npm run lint:check 2>&1 | tail -15; npx prettier --check tests/unit/converterService.tests.js 2>&1 | tail -3; Bash: npx eslint tests/unit/converterService.tests.js && npx prettier --check tests/unit/converterService.tests.js && echo OK; Bash: sed -n 26,40p eslint.config.js; ls external; git check-ignore -v external; git ls-files external | head -3; Bash: node -e "const {ESLint}=require('eslint');new ESLint().lintFiles(['tests/unit/converterService.tests.js']).then(r=>{cons…; Bash: cd .theseus/spawn && python3 -c "
- attempt 1: acceptance failed: `npm run lint:check`
- attempt 2: the executor's permissions refused: Bash: .theseus/oracle/unit.sh 2>&1 | tail -5; npm run lint:check > ../lint.log 2>&1; echo exit=$?; tail -3 ../lint.log; Bash: sed -i '38s/.*/{"packet":"PKT-0027","role":"executor","model":"claude-opus-5-5","date":"2026-11-02","hindered":{"ref":"w…
- attempt 2: acceptance failed: `npm run lint:check`
- attempt 3: the executor's permissions refused: Bash: f=.theseus/queue/in-progress/PKT-0027-*.md; grep -n -A12 "^target:" $f | head -20; grep -n -A40 "Executor log" $f | tail…
- attempt 3: acceptance failed: `npm run lint:check`
claude-opus-5-5, 2026-11-02.
Done: new `tests/unit/converterService.tests.js` (15 tests) drives `convertJson`/`convertXml` end to end with
`taskresult`, `DocsCoServer` (getRequestParams, addTask), `canvasservice` and `storage-base` mocked.
Pinned: async=true answers at once (end=false, no select, no sleep); `async: "true"` string is async;
`DEFAULT_SHARD_KEY` without shard query forces sync; sync loop sleeps `CONVERT_ASYNC_DELAY`=1000 ms per poll
until Ok and returns `<docId>/output.pdf` signed url; CONVERT_TIMEOUT after 4 polls with timeout 3000 ms (strict `>`);
Err and ErrToReload return `status_info` (ErrToReload also calls cleanupErrToReload); NeedParams -> UNKNOWN;
stale `last_open_date` -> CONVERT_TIMEOUT even when Ok; existing Ok task not re-queued; status None is re-queued;
bad outputtype -> CONVERT_PARAMS; auth failure code passed through; exception -> UNKNOWN; convertXml -> isJson=false.
Decisions:
- `utils` is stubbed with `jest.spyOn` in `beforeEach`, not `jest.mock`: utils and operationContext require each
  other, and a factory mock (`...requireActual`) gave operationContext a half-built module
  (`utils.getShardKeyByRequest is not a function`).
- `addTask` mock is a generator function (`function* () {}`): convertByCmd calls it with `yield*`.
- `getConvertionTimeout` stubbed to 3000 ms so the timeout path is fast; sleep resolves at once (no fake timers).
- `fillResponse` is stubbed to capture the ConvertStatus directly instead of parsing JSON/XML.
Surprises / not done:
- `.theseus/oracle/unit.sh` passes (148 passed, 1 skipped, 11 suites).
- `npm run lint:check` could NOT be completed: `eslint .` is killed (exit 137, OOM) twice. `external/` (sdkjs,
  web-apps, 1.5 GB, gitignored) is not in eslint `ignores`. Linting only the new file (`npx eslint <file>`, the
  ESLint API via node) was refused by my permissions, so the new file is not lint-verified by tooling. Follow-up
  requested in `.theseus/spawn/PKT-0027-ignore-external-in-eslint-config-js-so-npm-run-l.md`.
Attempt 2 (claude-opus-5-5, 2026-11-02): re-ran acceptance. `unit.sh` passes (148 passed, 1 skipped).
`npm run lint:check` is again killed (exit 137, OOM) while walking `external/`. This cannot be fixed inside the
target: the fix is an `external/**` entry in `eslint.config.js` (outside `target.files`, `create_in` is only
`tests/unit`), and flat config ignores no `.eslintignore`. The test file is unchanged. The packet is blocked
until the spawned follow-up (ignore `external/` in eslint) is merged, or until the factory widens the target to `eslint.config.js`.
Attempt 3 (claude-opus-5-5, 2026-11-02): same result. `unit.sh` passes (148 passed, 1 skipped);
`npm run lint:check` prints `Killed` (OOM in `eslint .` over the gitignored `external/`). The VM had 6.2 GB free
at the time. Nothing in the target can fix this; still blocked on the spawned eslint-ignore follow-up.
- block: 3 attempts failed; last: acceptance failed: `npm run lint:check`. Output:
```
 1: 0xe48bbe node::OOMErrorHandler(char const*, v8::OOMDetails const&) [node]
 2: 0x1248d00 v8::Utils::ReportOOMFailure(v8::internal::Isolate*, char const*, v8::OOMDetails const&) [node]
 3: 0x1248fd7 v8::internal::V8::FatalProcessOutOfMemory(v8::internal::Isolate*, char const*, v8::OOMDetails const&) [node]
 4: 0x1477ee5  [node]
 5: 0x1477f13  [node]
 6: 0x1490fea  [node]
 7: 0x14941b8  [node]
 8: 0x1cfcc61  [node]
Aborted
```
- release: the lint ran out of memory on the client's sources checked out under external/ (fixed in Theseus 0.15.3: this packet no longer gets them)
- attempt 1: the executor's permissions refused: Bash: cat > tests/unit/converterService.tests.js <<'EOF'; Bash: npm run lint:check > ../lint27.log 2>&1; echo exit=$?; tail -15 ../lint27.log; Bash: cd .theseus/spawn && f=PKT-0027-make-npm-run-lint-check-pass-ignore-or-fix-these.md && sed -i 's#    - "\[FILE\]"#    - …
- attempt 1: acceptance failed: `npm run lint:check`
- attempt 2: acceptance failed: `npm run lint:check`
- attempt 3: the executor's permissions refused: Bash: f=$(ls .theseus/queue/in-progress/PKT-0027-*.md)
- attempt 3: acceptance failed: `npm run lint:check`
Attempt 4 (claude-opus-5-5, 2026-11-02, after release): the test file from attempts 1-3 was not in this
worktree (never committed), so it was rewritten: `tests/unit/converterService.tests.js`, 16 tests with the
same coverage as above, plus "missing task row -> UNKNOWN". `external/` is gone, so `eslint .` no longer OOMs.
Decisions: `jest.mock` factories for taskresult (spread of requireActual + upsert/select), DocsCoServer,
canvasservice, wopiClient, storage-base; `utils` and `operationContext.Context` prototype stubbed with
`jest.spyOn` (as before). `addTask` mock is a plain function returning an empty iterator: a generator without
`yield` breaks the `require-yield` lint rule, and `yield*` needs an iterable.
Results: `.theseus/oracle/unit.sh` passes (11 suites, 149 passed, 1 skipped). `npm run lint:check` reports
nothing for the new file but still FAILS with 55 errors that were already there, all in `.theseus/oracle/perf/*.js`
(browser scripts from the perf packets: `window`/`editor` undefined, unused catch vars, empty blocks). Those files
are outside the target; follow-up requested in
`.theseus/spawn/PKT-0027-make-npm-run-lint-check-pass-ignore-or-fix-these.md` (ignore `.theseus/**` in eslint).
Not done: acceptance `npm run lint:check` cannot pass inside this target.
Attempt 5 (claude-opus-5-5, 2026-11-02): re-ran both acceptance commands, with no code changes.
`unit.sh` passes. `npm run lint:check` gives the same 54 errors and 1 warning: all errors are in
`.theseus/oracle/perf/*.js` and the warning is in AdminPanel. None of them is in the new test file.
Decision: I did not touch files outside the target (eslint.config.js, .theseus/oracle/perf). The packet stays
blocked until the spawned follow-up (ignore `.theseus/**` in eslint) is merged, or the target is widened.
Retrying this packet as it stands cannot pass.
Attempt 6 (claude-opus-5-5, 2026-11-02): no code changes. `unit.sh` passes. `npm run lint:check` fails with the
same 54 errors and 1 warning. The errors are all in `.theseus/oracle/perf/*.js`; the warning is in AdminPanel `useAiPlugin.js`.
None is in `tests/unit/converterService.tests.js`. The fix (ignore `.theseus/**` in `eslint.config.js`, or fix
the perf scripts) is outside the target. It is already requested in
`.theseus/spawn/PKT-0027-make-npm-run-lint-check-pass-ignore-or-fix-these.md`. Decision: I did not widen the scope.
The packet stays blocked until that follow-up merges or the target includes `eslint.config.js`.
- block: 3 attempts failed; last: acceptance failed: `npm run lint:check`. Output:
```
   20:13  error  'window' is not defined                 no-undef
   21:3   error  'window' is not defined                 no-undef
   24:65  error  'window' is not defined                 no-undef
   26:77  error  'window' is not defined                 no-undef
   38:53  error  'window' is not defined                 no-undef
   38:71  error  'window' is not defined                 no-undef
   38:85  error  'Asc' is not defined                    no-undef
   91:38  error  'editor' is not defined                 no-undef
   96:35  error  'editor' is not defined                 no-undef
   97:46  error  'requestAnimationFrame' is not defined  no-undef
  103:31  error  'window' is not defined                 no-undef
  103:85  error  'window' is not defined                 no-undef
  108:35  error  'editor' is not defined                 no-undef
  111:42  error  'window' is not defined                 no-undef
  112:42  error  'window' is not defined                 no-undef
/home/claude/euro-office-server.theseus-worktrees/PKT-0027/.theseus/oracle/perf/client-perf.js
  17:44  error  'window' is not defined                 no-undef
  17:61  error  'editor' is not defined                 no-undef
  17:94  error  'editor' is not defined                 no-undef
  24:39  error  'editor' is not defined                 no-undef
  24:85  error  'editor' is not defined                 no-undef
  49:37  error  'editor' is not defined                 no-undef
  50:48  error  'requestAnimationFrame' is not defined  no-undef
  58:37  error  'editor' is not defined                 no-undef
/home/claude/euro-office-server.theseus-worktrees/PKT-0027/.theseus/oracle/perf/coedit-split.js
  22:13  error  'window' is not defined                                                       no-undef
  23:3   error  'window' is not defined                                                       no-undef
  26:67  error  'window' is not defined                                                       no-undef
  28:79  error  'window' is not defined                                                       no-undef
  37:40  error  'window' is not defined                                                       no-undef
  37:57  error  'editor' is not defined                                                       no-undef
  37:90  error  'editor' is not defined                                                       no-undef
  42:50  error  'editor' is not defined                                                       no-undef
  43:49  error  'window' is not defined                                                       no-undef
  43:68  error  'window' is not defined                                                       no-undef
  66:14  error  'e' is defined but never used. Allowed unused caught errors must match /^_/u  no-unused-vars
  66:17  error  Empty block statement                                                         no-empty
/home/claude/euro-office-server.theseus-worktrees/PKT-0027/.theseus/oracle/perf/convert-large.js
  27:103  error  'e' is defined but never used. Allowed unused caught errors must match /^_/u  no-unused-vars
  46:157  error  'e' is defined but never used. Allowed unused caught errors must match /^_/u  no-unused-vars
/home/claude/euro-office-server.theseus-worktrees/PKT-0027/.theseus/oracle/perf/e2e-coedit.js
  21:40  error  'window' is not defined  no-undef
  21:57  error  'editor' is not defined  no-undef
  21:90  error  'editor' is not defined  no-undef
  26:59  error  'editor' is not defined  no-undef
/home/claude/euro-office-server.theseus-worktrees/PKT-0027/.theseus/oracle/perf/e2e-convert.js
  24:103  error  'e' is defined but never used. Allowed unused caught errors must match /^_/u  no-unused-vars
/home/claude/euro-office-server.theseus-worktrees/PKT-0027/.theseus/oracle/perf/load-coedit.js
   63:204  error  'e' is defined but never used. Allowed unused caught errors must match /^_/u  no-unused-vars
   63:207  error  Empty block statement                                                         no-empty
   81:41   error  'k' is defined but never used. Allowed unused args must match /^_/u           no-unused-vars
  120:12   error  'e' is defined but never used. Allowed unused caught errors must match /^_/u  no-unused-vars
  120:15   error  Empty block statement                                                         no-empty
  138:69   error  'window' is not defined                                                       no-undef
  139:105  error  'window' is not defined                                                       no-undef
  142:40   error  'window' is not defined                                                       no-undef
  142:57   error  'editor' is not defined                                                       no-undef
  145:43   error  'window' is not defined                                                       no-undef
  158:130  error  'e' is defined but never used. Allowed unused caught errors must match /^_/u  no-unused-vars
  158:133  error  Empty block statement                                                         no-empty
/home/claude/euro-office-server.theseus-worktrees/PKT-0027/AdminPanel/client/src/pages/AiIntegration/hooks/useAiPlugin.js
  185:6  warning  React Hook useEffect has missing dependencies: 'handleResetAiSettings' and 'handleResetAiTasks'. Either include them or remove the dependency array  react-hooks/exhaustive-deps
✖ 55 problems (54 errors, 1 warning)
```
- release: blocked by a lint failure already on the main branch (measurement scripts); a repair packet goes first
- attempt 1: the executor's permissions refused: Bash: npm run lint:check 2>&1 | tail -3; npx prettier --check tests/unit/converterService.tests.js; tail -1 .theseus/scoreboar…; Bash: python3 - <<'PY'
Attempt 7 (claude-opus-5-5, 2026-11-02): the test file was again absent (never committed), so it was rewritten and
is committed this time: `tests/unit/converterService.tests.js`, 17 tests. Lint on main is now clean (PKT-0035/0040/0049
merged), so both acceptance commands pass: `unit.sh` 150 passed, 1 skipped; `npm run lint:check` 0 errors, 1
pre-existing warning (AdminPanel useAiPlugin.js).
Pinned: async=true and async "true" answer at once (end=false, task queued, no select, no sleep); DEFAULT_SHARD_KEY
without `shardkey` query forces sync, with it stays async; sync loop sleeps CONVERT_ASYNC_DELAY=1000 ms per poll and
returns `{base}/conv_{key}_{format}/output.pdf`, filetype pdf; with timeout 3000 ms, CONVERT_TIMEOUT after exactly 4
sleeps (strict `>`); Err -> status_info; ErrToReload -> status_info + cleanupErrToReload; NeedParams -> UNKNOWN; no row
-> UNKNOWN; stale last_open_date -> CONVERT_TIMEOUT even if Ok; existing Ok task not re-queued and no sleep; status
None re-queued; bad outputtype -> CONVERT_PARAMS before any upsert; auth code passed through; exception -> UNKNOWN;
convertXml -> isJson=false.
Decisions: jest.mock factories for taskresult (requireActual spread), DocsCoServer, canvasservice, wopiClient,
storage-base; utils (fillResponse, sleep, getConvertionTimeout, getBaseUrlByRequest) and Context.prototype
(initFromRequest, initTenantCache) stubbed with jest.spyOn, because utils and operationContext require each other.
addTask mock returns an empty iterator (consumed with `yield*`). No fake timers: sleep resolves at once.
Surprise: earlier attempts' work was lost because it was never committed before the block; commit early.

## Spawned packets
- PKT-0035: Ignore external/ in eslint.config.js so npm run lint:check does not OOM
- PKT-0040: Make npm run lint:check pass: ignore or fix .theseus/oracle/perf scripts

## Review
- Approved by claude-opus-5-5-b: committed characterization tests pin the sync/async flow, polling, timeout and error statuses precisely, within scope and budget

## Lessons for the Atlas
