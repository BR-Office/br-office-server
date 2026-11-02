#!/bin/sh
# Starts the native Euro-Office Document Server stack on a machine without systemd
# (see environment.md, "After a VM restart"). The ds-* systemd units are the source of truth.
set -e
for s in postgresql redis-server rabbitmq-server; do service "$s" start >/dev/null 2>&1 || true; done
for unit in docservice converter example; do
  file=/usr/lib/systemd/system/ds-$unit.service
  [ -f "$file" ] || continue
  pgrep -u ds -f "/$(grep '^WorkingDirectory=' "$file" | sed 's/.*\///')/" >/dev/null && continue
  dir=$(grep '^WorkingDirectory=' "$file" | cut -d= -f2-)
  envs=$(grep '^Environment=' "$file" | cut -d= -f2- | tr '\n' ' ')
  # ExecStart is `/bin/sh -c '<command>'`: keep the quoted command only.
  cmd=$(grep '^ExecStart=' "$file" | cut -d= -f2- | sed "s/^\/bin\/sh -c '//; s/'\$//")
  (cd "$dir" && sudo -u ds -b env $envs sh -c "$cmd" >/dev/null 2>&1)
done
service nginx start >/dev/null 2>&1 || service nginx restart >/dev/null 2>&1 || true
for i in $(seq 1 60); do curl -sf http://127.0.0.1/healthcheck >/dev/null && exit 0; sleep 2; done
echo "documentserver did not answer /healthcheck after 120 s" >&2; exit 1
