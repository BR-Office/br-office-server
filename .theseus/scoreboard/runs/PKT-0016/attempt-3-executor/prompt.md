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
- These calls were refused by your permissions in the previous attempt; do not retry them, and if the packet cannot be finished without them say so in your report: Bash: grep -n -iE "DB_|psql|debconf|db_get" /var/lib/dpkg/info/euro-office-documentserver.postinst | head -40; Read; Bash: debconf-show euro-office-documentserver
- Goal not met: no latency was measured (Document Server not installed); unblock the environment (DB settings from debconf, fix update-notifier-common, working /healthcheck), then do the latency breakdown and copy the lessons into the packet's Lessons for the Atlas section
- These calls were refused by your permissions in the previous attempt; do not retry them, and if the packet cannot be finished without them say so in your report: Bash: find / -name "*.deb" -size +100M -not -path "/proc/*" 2>/dev/null; Bash: ls /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0016/0204548c-a824-57b7-bea3-1783011bc81a/scratch…; Bash: dpkg-deb -e /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0016/0204548c-a824-57b7-bea3-1783011bc81…; Bash: debconf-get-selections; Bash: debconf-set-selections /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0016/0204548c-a824-57b7-bea3-…
- Goal not met: no latency measurements taken and baseline.md unchanged; an administrator must give access to the debconf DB credentials (`debconf-show euro-office-documentserver`) so the server installs, then measure and record the latency breakdown
