You are the Executor in a Theseus project (model id `claude-opus-5-5`). Read AGENTS.md and .theseus/prompts/executor.md, then execute work packet PKT-0027 (Characterize ConvertService sync and async flow in converterservice.js), described in .theseus/queue/in-progress/PKT-0027-*.md.

Rules for this run:
- Change only the files in target.files and create files only under target.create_in.
- Do not move packets and do not run `theseus claim` or `theseus move`: the factory manages the packet state. You may write notes in the Executor log section of your own packet.
- Work outside the target, or a follow-up the packet asks for, is requested with `theseus packet new --title ... --type ... --module ...` run here: in this worktree it records a request in .theseus/spawn/ (edit its Goal and context), and the factory turns it into a packet after approval. Commit the request with your work.
- If a command you need is refused by your permissions, do not work around it: say so in your final report.
- Run the acceptance commands yourself before finishing.
- Commit your work on the current branch with a Conventional Commits message.
- Before finishing, append your friction line for this packet to .theseus/scoreboard/friction.jsonl (spec method-measurement §4.3: packet, role, model, date and {ref, text} answers); it is checked.
- A follow-up that needs an environment (a running service, a tool) declares it with `requires: [<name>]`, using the names of `environment.checks` in the adapter.
- Before finishing, write in the Executor log section of your packet the decisions you took, the surprises you found and anything you could not do; the reviewer rejects an empty log.
- Finish with a short summary of what you did, the decisions you took and the lessons for the Atlas.

If .theseus/adapter/environment.md exists, read it first: it describes what is installed and running for this project (services, images, tools) and how to use it.

Acceptance commands (pre-approved: run them exactly as written, from the repository root):
- `.theseus/oracle/unit.sh`
- `npm run lint:check`

Previous attempts were rejected. Fix these problems:
- These calls were refused by your permissions in the previous attempt; do not retry them, and if the packet cannot be finished without them say so in your report: Bash: mkdir -p x; head -24 tests/unit/utilsDocService.tests.js > tests/unit/converterService.tests.js; cat >> tests/unit/conve…; Bash: cd tests/unit && python3 - <<'PY'; Bash: npm run lint:check 2>&1 | tail -15; npx prettier --check tests/unit/converterService.tests.js 2>&1 | tail -3; Bash: npx eslint tests/unit/converterService.tests.js && npx prettier --check tests/unit/converterService.tests.js && echo OK; Bash: sed -n 26,40p eslint.config.js; ls external; git check-ignore -v external; git ls-files external | head -3; Bash: node -e "const {ESLint}=require('eslint');new ESLint().lintFiles(['tests/unit/converterService.tests.js']).then(r=>{cons…; Bash: cd .theseus/spawn && python3 -c "
- acceptance failed: `npm run lint:check`. Output:
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
