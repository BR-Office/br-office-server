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
- 2026-11-02 claude-opus-5-5 (attempt 5): **Progress on the setup, but still no measurement.**
  - Started postgresql, redis-server and rabbitmq-server. `sudo -u postgres psql` was allowed this time: I created role `onlyoffice` (password `onlyoffice`) and database `onlyoffice`. `psql -h localhost -U onlyoffice` connects.
  - `dpkg --configure -a` still fails on `update-notifier-common` (`apt_pkg`), and that blocks the fonts package and the DS package. `dpkg --configure --force-depends euro-office-documentserver` runs the DS postinst, which still says "ERROR: can't connect to postgressql database". So the package expects other credentials or another DB name (from debconf).
  - Reading the postinst (Read tool and grep) and `debconf-show euro-office-documentserver` were both refused ("requires approval"). I did not guess credentials or work around this.
  - Next step: an administrator runs `debconf-show euro-office-documentserver` (or reads the postinst DB section), creates the matching role/DB, removes or fixes `update-notifier-common`, then runs `dpkg --configure -a`. Grant Read on /var/lib/dpkg/info and `debconf-show` to measurement packets. Add that to environment.md.
- 2026-11-02 claude-opus-5-5 (attempt 6): **update-notifier-common fixed; still no measurement.**
  - Removed `update-notifier-common` (`dpkg --remove --force-depends`), as environment.md allows. That clears the `apt_pkg` blocker.
  - PostgreSQL is online. The DS postinst still says "ERROR: can't connect to postgressql database", so the debconf DB credentials still don't match role/DB `onlyoffice`/`onlyoffice`.
  - I tried three other ways to learn or set those credentials. All three were refused ("requires approval"): `dpkg-deb -e` of the .deb into the scratchpad (to read the postinst/templates), `debconf-get-selections`, and `debconf-set-selections` with a preseed file (scratchpad/preseed.txt, guessed `euro-office/db-*` and `onlyoffice/db-*` keys). Per the rules I did not retry the calls refused earlier (`debconf-show`, grep or Read of the postinst) and did not work around them.
  - Decision: I did not guess further or edit pg_hba. I recorded no numbers, and baseline.md is unchanged.
  - To unblock: grant one of `debconf-show`, `debconf-get-selections`, `debconf-set-selections` or `dpkg-deb -e`, or have an administrator run `debconf-show euro-office-documentserver` and create the matching role/DB. Then run `env DEBIAN_FRONTEND=noninteractive dpkg --configure -a` and check /healthcheck.
  - Not done: the whole Goal.
- 2026-11-02 claude-opus-5-5 (attempt 7): **Still blocked on the debconf DB credentials. No measurement was taken.**
  - PostgreSQL is online. `env DEBIAN_FRONTEND=noninteractive dpkg --configure --force-depends ttf-mscorefonts-installer euro-office-documentserver` configured the fonts package (EULA not accepted, so no MS fonts). The DS postinst still fails with "ERROR: can't connect to postgressql database".
  - I tried to learn which DB user the postinst uses from the PostgreSQL log (`tail /var/log/postgresql/postgresql-16-main.log`). It was blocked because it is outside the worktree. I did not retry the calls refused earlier (debconf-show/get/set-selections, dpkg-deb -e, reading the postinst), and I did not work around them through psql `pg_read_file`.
  - To unblock (administrator): run `debconf-show euro-office-documentserver`, create the matching role/DB, then run `env DEBIAN_FRONTEND=noninteractive dpkg --configure -a` and check `/healthcheck`. Or allow Read on /var/lib/dpkg/info and /var/log/postgresql for measurement packets.
- block: 3 attempts failed; last: goal not met — no latency measurements taken and baseline.md unchanged; an admin must fix the Document Server PostgreSQL install before the measurements are done and recorded
- release: measurement packets now run with every privilege; debconf-show lists the DB settings (see environment.md)
- 2026-11-02 claude-opus-5-5 (attempt 8): **Measured. Stack running, breakdown recorded in baseline.md.**
  - Setup: `debconf-show` gave DB user/name `ds`/`ds`, password hidden, so I set `ds/db-pwd` with debconf-set-selections and created role/DB `ds`. The postinst then got through the DB, but it still exits 1 because it calls `systemctl` (no systemd). I started docservice, converter and example by hand as user `ds` with the env from the systemd unit files. I set `allowPrivateIPAddress` in /etc/euro-office/documentserver/local.json and got `/healthcheck` → true. These system changes are outside the repo; the recipe is in a spawn request for environment.md.
  - New script `.theseus/oracle/perf/client-breakdown.js` (client-perf.js left as is). It uploads samples through the example, splits open time using the editor frame's resource timings (scripts, Editor.bin request/receive, then load complete), and splits each remote apply using in-page WebSocket send/message timestamps (A batching / wire / B apply). Raw results: `perf/client-breakdown-2026-11-02.json`.
  - Samples generated with python-docx/openpyxl/python-pptx, kept in the scratchpad and not committed (regenerable, no images): docx 10 p and 100 p, xlsx 10 k rows, pptx 50 slides.
  - Findings: open takes 3.4–4.4 s. About 1.5–2.3 s is scripts, and 1.5–2.4 s comes after Editor.bin (parse, fonts, render), which grows with size. The server/x2t part overlaps with script loading and isn't isolated. The remote-apply tail is on the receiving client (B apply p90 105–143 ms). The wire including DocsCoServer is 6–8 ms p50, ≤20 ms max.
  - Surprises: Editor.bin is sometimes requested before the last script arrives (scripts load lazily). transferSize is 0 for fonts/bin (reported as counts and durations only). The marker total includes ~20 ms of key typing.
  - Not done: x2t time isolated from the client open; documents with images; a real network.

## Spawned packets
- PKT-0019: Record the working native Document Server install recipe in environment.md

## Review
- Rejected by claude-opus-5-5-b: No latency measurements were taken, so the goal is not met; set up the Document Server stack (or grant the needed permissions), fix environment.md, and make the acceptance check require real numbers before retrying.
- Rejected by claude-opus-5-5-b: No latency measured (goal unmet); finish the Document Server setup (PostgreSQL user and database) and retry with an acceptance check that requires real docx/xlsx/pptx timings under .theseus/oracle/perf/
- Rejected by claude-opus-5-5-b: Goal not done: no client open/co-edit latency breakdown was measured (the stack is still not set up and the acceptance check passes trivially). Set up the stack first (spawn request), then retry and record real numbers in baseline.md.
- Rejected by claude-opus-5-5-b: Goal not met: no latency was measured (Document Server not installed); unblock the environment (DB settings from debconf, fix update-notifier-common, working /healthcheck), then do the latency breakdown and copy the lessons into the packet's Lessons for the Atlas section
- Rejected by claude-opus-5-5-b: Goal not met: no latency measurements taken and baseline.md unchanged; an administrator must give access to the debconf DB credentials (`debconf-show euro-office-documentserver`) so the server installs, then measure and record the latency breakdown
- Rejected by claude-opus-5-5-b: goal not met — no latency measurements taken and baseline.md unchanged; an admin must fix the Document Server PostgreSQL install before the measurements are done and recorded

## Lessons for the Atlas
