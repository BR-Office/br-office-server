You are the Executor in a Theseus project (model id `claude-opus-5-5`). Read AGENTS.md and .theseus/prompts/executor.md, then execute work packet PKT-0016 (Break down client open and co-edit latency on realistic documents), described in .theseus/queue/in-progress/PKT-0016-*.md.

Rules for this run:
- Change only the files in target.files and create files only under target.create_in.
- Do not move packets and do not run `theseus claim` or `theseus move`: the factory manages the packet state. You may write notes in the Executor log section of your own packet.
- Work outside the target, or a follow-up the packet asks for, is requested with `theseus packet new --title ... --type ... --module ...` run here: in this worktree it records a request in .theseus/spawn/ (edit its Goal and context), and the factory turns it into a packet after approval. Commit the request with your work.
- If a command you need is refused by your permissions, do not work around it: say so in your final report.
- Run the acceptance commands yourself before finishing.
- Commit your work on the current branch with a Conventional Commits message.
- Before finishing, write in the Executor log section of your packet the decisions you took, the surprises you found and anything you could not do; the reviewer rejects an empty log.
- Finish with a short summary of what you did, the decisions you took and the lessons for the Atlas.

If .theseus/adapter/environment.md exists, read it first: it describes what is installed and running for this project (services, images, tools) and how to use it.

Acceptance commands (pre-approved: run them exactly as written, from the repository root):
- `test -s .theseus/oracle/baseline.md`

Previous attempts were rejected. Fix these problems:
- These calls were refused by your permissions in the previous attempt; do not retry them, and if the packet cannot be finished without them say so in your report: Bash: cat .theseus/oracle/perf/client-perf.js; curl -fsSL -o /tmp/eo.deb https://github.com/Euro-Office/DocumentServer/release…; Bash: S=/tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0016/0204548c-a824-57b7-bea3-1783011bc81a/scratchp…; Bash: curl -fsSL -o /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0016/0204548c-a824-57b7-bea3-1783011bc…; Bash: which python3; python3 --version; ls /usr/bin/python3*; grep -n python /var/lib/dpkg/info/update-notifier-common.postins…; Bash: python3 --version; /usr/bin/python3.12 -c "import apt_pkg" && echo ok312; Bash: dpkg -L euro-office-documentserver | grep -E "postinst|\.sql$|supervisor|nginx" | head; dpkg -l | grep -E "rabbit|erlang…; Read
- No latency measurements were taken, so the goal is not met; set up the Document Server stack (or grant the needed permissions), fix environment.md, and make the acceptance check require real numbers before retrying.
