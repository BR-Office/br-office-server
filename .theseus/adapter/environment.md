# Environment

What is installed and running for this project in the factory's machine (a cloud VM: 2 CPUs, 7 GB RAM).
Absolute numbers are lower than in production; proportions (where the time goes) are what matter.

## Euro-Office Document Server (full stack)

- The Docker daemon is running, and the **Euro-Office** image is already pulled:
  `ghcr.io/euro-office/documentserver:latest` (Euro-Office's own build: DocService, FileConverter with x2t,
  the compiled `sdkjs`/`web-apps` clients, PostgreSQL, Redis and RabbitMQ inside the container).
- Start it (about one minute until healthy):
  ```sh
  docker run -d --name eo -p 8080:80 -e JWT_ENABLED=false ghcr.io/euro-office/documentserver:latest
  until curl -sf http://127.0.0.1:8080/healthcheck; do sleep 5; done
  ```
- Stop it when done: `docker rm -f eo`. Only one instance at a time (memory).
- Inside the container: `docker exec eo ...` (x2t is under `/var/www/*/documentserver/server/FileConverter/bin`).
- The ConvertService, CommandService and the editors' test example are served on port 8080
  (`EXAMPLE_ENABLED=true` adds the example integration page for opening documents in a browser).

## Browser

Chromium and Playwright are installed (`require('playwright')` works from any directory; `chromium.launch()`
needs no options). Use them to measure the client: open, render, apply remote changes, typing.

## Also on the machine

Node.js 22, PostgreSQL client, Redis server; `apt-get` works for missing packages.
