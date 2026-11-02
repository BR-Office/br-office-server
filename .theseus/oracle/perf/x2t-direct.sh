#!/bin/sh
# Raw x2t time per conversion inside the container, no DocService/RabbitMQ (PKT-0015).
# Usage: sh .theseus/oracle/perf/x2t-direct.sh   (container `eo` running, see .theseus/adapter/environment.md)
# Subtract from e2e-convert.js results to get the service overhead (HTTP + Redis/PostgreSQL + RabbitMQ + storage).
set -e
docker cp "$(dirname "$0")/samples/." eo:/tmp/s/
docker exec eo sh -c '
cd /var/www/euro-office/documentserver/server/FileConverter/bin
for p in docx:pdf docx:odt xlsx:pdf xlsx:ods pptx:pdf pptx:odp pdf:docx; do
  f=${p%:*}; t=${p#*:}; all=""
  for i in 1 2 3 4 5; do
    s=$(date +%s%N); ./x2t /tmp/s/new.$f /tmp/s/o.$t >/dev/null 2>&1 || echo "x2t failed $p"
    all="$all $(( ($(date +%s%N)-s)/1000000 ))"
  done
  echo "$f->$t ms:$all"
done'
