---
id: SPAWN
title: Record the working native Document Server install recipe in environment.md
type: investigate
priority: medium
module: project

origin:
  type: packet
  ref: PKT-0016

depends_on: []

target:
  files:
    - .theseus/adapter/environment.md
  create_in: []

context:
  cards: [project]
  references: []

contract:
  preserve:
    - No change to the project's source code
  forbidden: []

acceptance:
  commands:
    - grep -q 'ds/db-pwd' .theseus/adapter/environment.md

budget:
  max_files_changed: 6
  max_diff_lines: 800
  max_cost_usd: 5.00
  max_attempts: 3

roles:
  executor: null
  reviewer: null
---

## Goal
Record the working native Document Server install recipe in environment.md.

## Essential context
PKT-0016 got the native package running. Recipe that worked (not yet in environment.md):
1. `debconf-show euro-office-documentserver` shows db user/name `ds`/`ds`; the password is unknown, so set it:
   `echo "euro-office-documentserver ds/db-pwd password ds" | debconf-set-selections`.
2. `sudo -u postgres psql -c "CREATE USER ds WITH PASSWORD 'ds';" -c "CREATE DATABASE ds OWNER ds;"`.
3. Start postgresql, redis-server, rabbitmq-server; `env DEBIAN_FRONTEND=noninteractive dpkg --configure -a`.
   The postinst still exits 1 at the end: it calls `systemctl` (no systemd here). DB and config are done anyway.
4. Start the services by hand as user `ds`, with the Environment/WorkingDirectory of
   /usr/lib/systemd/system/ds-{docservice,converter,example}.service (sudo -u ds -b env ... ./docservice, etc.).
5. In /etc/euro-office/documentserver/local.json set
   `services.CoAuthoring.request-filtering-agent.allowPrivateIPAddress: true`; `service nginx restart`.
6. `curl localhost/healthcheck` → true; example at http://localhost/example/ (upload: POST /example/upload, field `uploadedFile`).

## Suggested plan

## Executor log

## Spawned packets

## Review

## Lessons for the Atlas
