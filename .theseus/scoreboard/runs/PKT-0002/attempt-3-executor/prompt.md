You are the Cartographer in a Theseus project (model id `claude-opus-5-5`). Read AGENTS.md and .theseus/prompts/cartographer.md, then execute work packet PKT-0002 (Map the docservice module (Atlas card)), described in .theseus/queue/in-progress/PKT-0002-*.md.

Rules for this run:
- Change only the files in target.files and create files only under target.create_in.
- Do not move packets and do not run `theseus claim` or `theseus move`: the factory manages the packet state. You may write notes in the Executor log section of your own packet.
- Work outside the target, or a follow-up the packet asks for, is requested with `theseus packet new --title ... --type ... --module ...` run here: in this worktree it records a request in .theseus/spawn/ (edit its Goal and context), and the factory turns it into a packet after approval. Commit the request with your work.
- If a command you need is refused by your permissions, do not work around it: say so in your final report.
- Run the acceptance commands yourself before finishing.
- Commit your work on the current branch with a Conventional Commits message.
- Before finishing, write in the Executor log section of your packet the decisions you took, the surprises you found and anything you could not do; the reviewer rejects an empty log.
- Finish with a short summary of what you did, the decisions you took and the lessons for the Atlas.

Acceptance commands (pre-approved: run them exactly as written, from the repository root):
- `test -s .theseus/atlas/docservice.md`

Previous attempts were rejected. Fix these problems:
- These calls were refused by your permissions in the previous attempt; do not retry them, and if the packet cannot be finished without them say so in your report: Bash: cat .theseus/spec/module-card.md; ls .theseus .theseus/adapter; cat .theseus/atlas/graph.json 2>/dev/null | head -50; th…; Bash: cat .theseus/spec/module-card.md; ls .theseus .theseus/adapter; ls .theseus/atlas; theseus --help 2>&1 | head -40; wc -l…; Bash: cd DocService/sources && wc -l ai/*.js databaseConnectors/*.js routes/*.js 2>/dev/null; grep -nE "app\.(get|post|put|use…; Bash: sed -n '/^## Responsibility/,$p' .theseus/atlas/docservice.md | wc -w; test -s .theseus/atlas/docservice.md && echo OK
- Goal requires adding the docservice row to .theseus/atlas/INDEX.md, which was not done. Add INDEX.md to target.files, or remove that requirement from the goal, then complete it. The card itself is sound: 4 claims checked, all correct.
- These calls were refused by your permissions in the previous attempt; do not retry them, and if the packet cannot be finished without them say so in your report: Bash: theseus --help 2>&1 | head -30; head -30 .theseus/atlas/docservice.md; Bash: f=.theseus/spawn/PKT-0002-regenerate-atlas-index-md-rows-from-module-cards.md
- Goal requires the INDEX.md row but INDEX.md is outside target.files; factory must add `.theseus/atlas/INDEX.md` to target.files (or drop the row from the goal) and rerun
