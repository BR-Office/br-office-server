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
  redis-server, nginx) and the Document Server processes with `supervisorctl` if the package uses it;
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

## Upstream history (defect rate)

`git clone` of public repositories works (github.com/Euro-Office/server, github.com/ONLYOFFICE/server).
The GitHub API (`gh api`, issues) is not available here.

## Browser

Chromium and Playwright are installed (`require('playwright')` works from any directory; `chromium.launch()`
needs no options). Use them to measure the client: open, render, apply remote changes, typing.

## Also on the machine

Node.js 22, PostgreSQL client, Redis server; `apt-get` works for missing packages.
