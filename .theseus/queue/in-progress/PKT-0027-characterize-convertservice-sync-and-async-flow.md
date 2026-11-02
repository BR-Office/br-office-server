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
  reviewer: null
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

## Spawned packets
- PKT-0035: Ignore external/ in eslint.config.js so npm run lint:check does not OOM

## Review

## Lessons for the Atlas
