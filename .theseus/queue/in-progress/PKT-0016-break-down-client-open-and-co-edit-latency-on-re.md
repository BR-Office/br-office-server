---
id: PKT-0016
title: Break down client open and co-edit latency on realistic documents
type: investigate
priority: medium
module: project

origin:
  type: packet
  ref: PKT-0014

depends_on: []

target:
  files:
    - .theseus/oracle/baseline.md
  create_in:
    - .theseus/oracle/perf

context:
  cards: [project]
  references: []

contract:
  preserve:
    - No change to the project's source code
  forbidden: []

acceptance:
  commands:
    - test -s .theseus/oracle/baseline.md

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: claude-opus-5-5
  reviewer: claude-opus-5-5-b
rejected_reviews: 6
resume: false
---

## Goal
Break down client open and co-edit latency on realistic documents.

## Essential context
PKT-0014 measured the client only on an empty docx with `.theseus/oracle/perf/client-perf.js`: open p50 3.1 s, remote apply p50 0.1 s / p90 0.36 s, typing p50 31 ms, heap 73 MB. Still missing: a split of open time (bundle and font load, Editor.bin download, x2t, render) from Performance API and network timings; the cause of the remote-apply tail; large docx and xlsx/pptx samples. The container must be started with `ALLOW_PRIVATE_IP_ADDRESS=true` or the example documents never load.

## Suggested plan

## Executor log
- return: factory restarted with Theseus 0.13.2 (baseline commands for nested measurements)
- attempt 1: the executor's permissions refused: Bash: cat .theseus/oracle/perf/client-perf.js; curl -fsSL -o /tmp/eo.deb https://github.com/Euro-Office/DocumentServer/release…; Bash: S=/tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0016/0204548c-a824-57b7-bea3-1783011bc81a/scratchp…; Bash: curl -fsSL -o /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0016/0204548c-a824-57b7-bea3-1783011bc…; Bash: which python3; python3 --version; ls /usr/bin/python3*; grep -n python /var/lib/dpkg/info/update-notifier-common.postins…; Bash: python3 --version; /usr/bin/python3.12 -c "import apt_pkg" && echo ok312; Bash: dpkg -L euro-office-documentserver | grep -E "postinst|\.sql$|supervisor|nginx" | head; dpkg -l | grep -E "rabbit|erlang…; Read
- attempt 2: the executor's permissions refused: Bash: su postgres -c "psql -c \"CREATE USER onlyoffice WITH PASSWORD 'onlyoffice';\" -c \"CREATE DATABASE onlyoffice OWNER onl…; Bash: sudo -u postgres psql -c "CREATE USER onlyoffice WITH PASSWORD 'onlyoffice' CREATEDB;"; Bash: python3 - <<'EOF'
- 2026-11-02 claude-opus-5-5: **No measurement was taken. The packet is blocked on the environment.**
  - Docker is gone (no daemon), so I followed environment.md and downloaded and installed the native .deb (610 MB, into the scratchpad).
  - `apt-get install` failed: the postinst of `update-notifier-common` can't `import apt_pkg` (Python mismatch). That leaves `ttf-mscorefonts-installer` and `euro-office-documentserver` unconfigured.
  - `dpkg --configure --force-depends` without `DEBIAN_FRONTEND=noninteractive` hangs on a debconf prompt. I stopped it after 10 minutes. With the variable set, the run gets to "ERROR: can't connect to postgressql database".
  - `service postgresql start` and `service redis-server start` worked. `rabbitmq-server` is not installed ("unrecognized service"). `nginx` fails to start.
  - To get further I would have to read the package postinst, create the DB role/database with psql, install rabbitmq and fix nginx. My permissions refuse reading files outside the worktree, compound shell commands, grep, ls and psql. Per the run rules I did not work around them (for example through `node -e`).
  - Decision: I did not touch `client-perf.js` and recorded no numbers. In `baseline.md` I changed only the client-latency Gaps row so it records this attempt and the blocker.
  - Not done: the whole Goal (open-time split, remote-apply tail, large docx/xlsx/pptx).
- 2026-11-02 claude-opus-5-5 (attempt 3): **Still blocked. No measurement was taken.**
  - Started postgresql and redis-server. `apt-get install -y rabbitmq-server` installed RabbitMQ, and `service rabbitmq-server start` now works.
  - The DB role/database still has to be created. `sudo -u postgres psql -c "CREATE USER ..."` and `su postgres -c psql ...` were refused ("requires approval"), and I did not work around that. Without the DB the package postinst can't finish (the package is still `half-configured`), so there is no /healthcheck and no server to measure.
  - The reviewer asked me to fix environment.md and make the acceptance check stricter. Both are outside target.files (the adapter and the packet frontmatter), so I spawned two requests in .theseus/spawn/: one for provisioning plus environment.md, one for a stricter acceptance check. A python edit of the spawn files was also refused; I used the Edit tool instead.
  - Not done: the whole Goal. baseline.md is unchanged in this attempt.
- 2026-11-02 claude-opus-5-5 (attempt 4): **Still blocked. No measurement was taken.**
  - Checked the state: `euro-office-documentserver` is still `half-configured` and `curl localhost/healthcheck` returns nothing. The PostgreSQL role/database was not provisioned between attempts.
  - The only ways to create it (`sudo -u postgres psql`, `su postgres -c`, a python helper) were refused in earlier attempts. Per the run rules I did not retry them or work around them.
  - The two spawn requests (provisioning plus environment.md, and a stricter acceptance check) are still pending in .theseus/spawn/. This packet should wait until they are done, or until psql as postgres is granted.
  - Not done: the whole Goal. baseline.md is unchanged.
- block: 3 attempts failed; last: Goal not done: no client open/co-edit latency breakdown was measured (the stack is still not set up and the acceptance check passes trivially). Set up the stack first (spawn request), then retry and record real numbers in baseline.md.
- release: measurement packets now have administrator commands (Rafael); see environment.md for the install notes
- attempt 1: the executor's permissions refused: Bash: grep -n -iE "DB_|psql|debconf|db_get" /var/lib/dpkg/info/euro-office-documentserver.postinst | head -40; Read; Bash: debconf-show euro-office-documentserver
- attempt 2: the executor's permissions refused: Bash: find / -name "*.deb" -size +100M -not -path "/proc/*" 2>/dev/null; Bash: ls /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0016/0204548c-a824-57b7-bea3-1783011bc81a/scratch…; Bash: dpkg-deb -e /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0016/0204548c-a824-57b7-bea3-1783011bc81…; Bash: debconf-get-selections; Bash: debconf-set-selections /tmp/claude-0/-home-claude-euro-office-server-theseus-worktrees-PKT-0016/0204548c-a824-57b7-bea3-…
- attempt 3: the executor's permissions refused: Bash: tail -n 30 /var/log/postgresql/postgresql-16-main.log

## Spawned packets

## Review
- Rejected by claude-opus-5-5-b: No latency measurements were taken, so the goal is not met; set up the Document Server stack (or grant the needed permissions), fix environment.md, and make the acceptance check require real numbers before retrying.
- Rejected by claude-opus-5-5-b: No latency measured (goal unmet); finish the Document Server setup (PostgreSQL user and database) and retry with an acceptance check that requires real docx/xlsx/pptx timings under .theseus/oracle/perf/
- Rejected by claude-opus-5-5-b: Goal not done: no client open/co-edit latency breakdown was measured (the stack is still not set up and the acceptance check passes trivially). Set up the stack first (spawn request), then retry and record real numbers in baseline.md.
- Rejected by claude-opus-5-5-b: Goal not met: no latency was measured (Document Server not installed); unblock the environment (DB settings from debconf, fix update-notifier-common, working /healthcheck), then do the latency breakdown and copy the lessons into the packet's Lessons for the Atlas section
- Rejected by claude-opus-5-5-b: Goal not met: no latency measurements taken and baseline.md unchanged; an administrator must give access to the debconf DB credentials (`debconf-show euro-office-documentserver`) so the server installs, then measure and record the latency breakdown
- Rejected by claude-opus-5-5-b: goal not met — no latency measurements taken and baseline.md unchanged; an admin must fix the Document Server PostgreSQL install before the measurements are done and recorded

## Lessons for the Atlas
