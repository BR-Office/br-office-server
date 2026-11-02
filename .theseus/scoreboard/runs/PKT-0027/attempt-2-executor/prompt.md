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
- These calls were refused by your permissions in the previous attempt; do not retry them, and if the packet cannot be finished without them say so in your report: Bash: cat > tests/unit/converterService.tests.js <<'EOF'; Bash: npm run lint:check > ../lint27.log 2>&1; echo exit=$?; tail -15 ../lint27.log; Bash: cd .theseus/spawn && f=PKT-0027-make-npm-run-lint-check-pass-ignore-or-fix-these.md && sed -i 's#    - "\[FILE\]"#    - …
- acceptance failed: `npm run lint:check`. Output:
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
