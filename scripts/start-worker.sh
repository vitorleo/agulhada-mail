#!/usr/bin/env sh
set -eu

if [ -f /app/agulhada-mail/.env ]; then
  set -a
  . /app/agulhada-mail/.env
  set +a
fi

cd /app/agulhada-mail
exec node dist/src/worker.js
