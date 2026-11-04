You are the Diagnostician in a Theseus project (model id `claude-opus-5-5`). Read AGENTS.md and .theseus/prompts/diagnostician.md, then execute work packet PKT-0146 (Diagnose the docservice module again (round 3)), described in .theseus/queue/in-progress/PKT-0146-*.md.

Rules for this run:
- Change only the files in target.files and create files only under target.create_in.
- Do not move packets and do not run `theseus claim` or `theseus move`: the factory manages the packet state. You may write notes in the Executor log section of your own packet.
- Work outside the target, or a follow-up the packet asks for, is requested with `theseus packet new --title ... --type ... --module ...` run here: in this worktree it records a request in .theseus/spawn/ (edit its Goal and context), and the factory turns it into a packet after approval. Commit the request with your work.
- If a command you need is refused by your permissions, do not work around it: say so in your final report.
- Run the acceptance commands yourself before finishing.
- Commit your work on the current branch with a Conventional Commits message.
- Before finishing, append your friction line for this packet to .theseus/scoreboard/friction.jsonl (spec method-measurement §4.3: packet, role, model, date and {ref, text} answers); it is checked.
- A follow-up that needs an environment (a running service, a tool) declares it with `requires: [<name>]`, using the names of `environment.checks` in the adapter.
- Before finishing, run `theseus scope-check`: it reports any file you changed outside the target (rule R2), in this repository or in a fork checkout, as the factory will.
- Before finishing, write in the Executor log section of your packet the decisions you took, the surprises you found and anything you could not do; the reviewer rejects an empty log.
- Finish with a short summary of what you did, the decisions you took and the lessons for the Atlas.

If .theseus/adapter/environment.md exists, read it first: it describes what is installed and running for this project (services, images, tools) and how to use it.

Acceptance commands (pre-approved: run them exactly as written, from the repository root):
- `grep -q "^verdict: " .theseus/diagnosis/DIAG-docservice.md`
- `grep -q "^goals_hash: dcb03039" .theseus/diagnosis/DIAG-docservice.md`
- `grep -q "^round: 3" .theseus/diagnosis/DIAG-docservice.md`
- `test -s .theseus/oracle/rounds/docservice-r3.md`
- `theseus validate`

Environments that are up right now (the factory just ran these checks and they passed; .theseus/adapter/environment.md says how to use them):
- `documentserver`: `curl -sf http://127.0.0.1/healthcheck`
- `browser`: `node -e "require('playwright')"`
Do not report one of these as missing: use it, and if a script points elsewhere (another port, a container), point it here. If you still cannot reach it, say exactly what you ran and what came back.
