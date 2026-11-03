# Environment

What is installed and running for this project in the factory's machine (a cloud VM: 2 CPUs, 7 GB RAM).
Absolute numbers are lower than in production; proportions (where the time goes) are what matter.

## Euro-Office Document Server (full stack, native)

Install Euro-Office's own package directly on the machine (Rafael: no Docker, it only adds overhead):

```sh
curl -fL -o /tmp/eo.deb https://github.com/Euro-Office/DocumentServer/releases/download/v9.3.7-1/euro-office-documentserver_9.3.7-1_amd64.deb
apt-get install -y /tmp/eo.deb    # pulls PostgreSQL, RabbitMQ, nginx and the rest as dependencies
```

- It brings DocService, FileConverter with x2t, and the compiled `sdkjs`/`web-apps` clients.
- There is no systemd here: start services with `service <name> start` (postgresql, rabbitmq-server,
  redis-server, nginx) and the Document Server processes by hand (see the recipe below);
  check `/healthcheck` on the nginx port.
- Once installed it stays installed for later packets: check before installing again.
- For the example documents to load, private addresses must be allowed (`ALLOW_PRIVATE_IP_ADDRESS`
  in the Document Server configuration), as PKT-0014 found.
- PKT-0014 and PKT-0015 measured with the Docker image `ghcr.io/euro-office/documentserver:latest`
  (same Euro-Office build). Later measurements use the native package; say so next to the numbers.

### Notes from the first install attempt (PKT-0016)

- Run apt non-interactively: `env DEBIAN_FRONTEND=noninteractive apt-get install -y /tmp/eo.deb`
  (otherwise `dpkg --configure` waits on a debconf prompt).
- The `postinst` of `update-notifier-common` fails with `import apt_pkg` (Python mismatch on this VM);
  it is unrelated to the Document Server and can be removed or reconfigured.
- RabbitMQ is not preinstalled: `apt-get install -y rabbitmq-server`, then `service rabbitmq-server start`.
- The package's configuration needs its PostgreSQL role and database before it can finish
  (`sudo -u postgres psql ...`); then `dpkg --configure -a`.
- Measurement packets run with every privilege (Rafael authorized it for this disposable VM): any
  command, any path (`debconf-show`, `dpkg-deb -e`, logs under /var/log, files under /var/lib/dpkg).
- `debconf-show euro-office-documentserver` lists the package's settings (`ds/db-*`, `ds/rabbitmq-*`):
  create the PostgreSQL role and database it expects, then `env DEBIAN_FRONTEND=noninteractive dpkg --configure -a`.
- `update-notifier-common` was removed by PKT-0016 (it broke `dpkg --configure -a`).

### Working install recipe (PKT-0016, recorded by PKT-0019)

After `apt-get install` of the package (see above), this got the native stack running:

1. `debconf-show euro-office-documentserver` shows db user/name `ds`/`ds`; the password is unknown, so set it:
   `echo "euro-office-documentserver ds/db-pwd password ds" | debconf-set-selections`
2. `sudo -u postgres psql -c "CREATE USER ds WITH PASSWORD 'ds';" -c "CREATE DATABASE ds OWNER ds;"`
3. `service postgresql start; service redis-server start; service rabbitmq-server start`, then
   `env DEBIAN_FRONTEND=noninteractive dpkg --configure -a`.
   The postinst still exits 1 at the end because it calls `systemctl` (no systemd here);
   the database and configuration are done anyway.
4. Start the Document Server processes by hand as user `ds`, copying `Environment=` and
   `WorkingDirectory=` from `/usr/lib/systemd/system/ds-{docservice,converter,example}.service`
   (e.g. `cd <WorkingDirectory> && sudo -u ds -b env <Environment...> ./docservice`; same for converter
   and example). There is no supervisor config: these units are the source of truth.
5. In `/etc/euro-office/documentserver/local.json` set
   `services.CoAuthoring.request-filtering-agent.allowPrivateIPAddress: true`, then `service nginx restart`.
6. Check: `curl localhost/healthcheck` returns `true`; the example is at http://localhost/example/
   (upload: `POST /example/upload`, form field `uploadedFile`).

After a VM restart only steps 3 (services, not dpkg), 4 and the nginx start are needed;
`.theseus/adapter/scripts/start-documentserver.sh` does them, and the factory runs it by itself
when the `documentserver` check fails (`environment.start` in the adapter).

## Upstream history (defect rate)

`git clone` of public repositories works (github.com/Euro-Office/server, github.com/ONLYOFFICE/server).
The GitHub API (`gh api`, issues) is not available here.

## Other Euro-Office repositories (read only)

The client (`sdkjs`, `web-apps`) and the converter (`core`, x2t) are checked out in every worktree under
`external/` by the factory, from shallow mirrors of github.com/Euro-Office. They are read-only clones:
nothing under `external/` is committed to this repository, and changing their code needs forks (not
created yet). The installed Document Server runs the compiled build of the same projects.
The forms addon is not cloned by the factory: `.theseus/oracle/sdkjs-word.sh` clones it shallow on
first run (PKT-0056) into `external/sdkjs/.theseus-addons/sdkjs-forms` (inside the git-excluded
`external/sdkjs`, so it is never committed) and builds `develop` with
`SDK_ADDONS=../.theseus-addons/sdkjs-forms`, as upstream CI does with `../../sdkjs-forms` (stamp `external/sdkjs/develop/.theseus-addons-forms`).

### `external/sdkjs.base` (differential oracle baseline, PKT-0098)

`.theseus/oracle/differential/build.sh` (via `differential/sdkjs-common.sh`) compares `external/sdkjs`
against `external/sdkjs.base`: a checkout of upstream `main` of the sdkjs mirror. The factory does not
create it yet; if it is missing in a packet worktree, create it from the repository root with

```sh
M=$(git -C external/sdkjs remote get-url origin)   # the shallow mirror under ../.external/
git clone --depth 1 -b main "file://$M" external/sdkjs.base
```

(gave `9cea536` in PKT-0097 and PKT-0098). `git clone --shared` of `external/sdkjs` does not work: that clone
is shallow and has no `main`. `external/sdkjs.base` is excluded by `.git/info/exclude` and must never be committed.

## Browser

Chromium and Playwright are installed (`require('playwright')` works from any directory; `chromium.launch()`
needs no options). Use them to measure the client: open, render, apply remote changes, typing.

## Also on the machine

Node.js 22, PostgreSQL client, Redis server; `apt-get` works for missing packages.
