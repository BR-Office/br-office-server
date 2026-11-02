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

## Browser

Chromium and Playwright are installed (`require('playwright')` works from any directory; `chromium.launch()`
needs no options). Use them to measure the client: open, render, apply remote changes, typing.

## Also on the machine

Node.js 22, PostgreSQL client, Redis server; `apt-get` works for missing packages.
