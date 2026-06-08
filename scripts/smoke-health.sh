#!/usr/bin/env bash
# Smoke-check the MVP stack: verify every service answers GET /health after
# `docker compose up`. Exits non-zero if any service is unhealthy.
#
# Usage:  ./scripts/smoke-health.sh
set -u

services=(
  "gateway 8000"
  "auth 8001"
  "user 8002"
  "training 8003"
  "nutrition 8004"
  "community 8005"
  "ai 8006"
)

fail=0
for entry in "${services[@]}"; do
  name=${entry%% *}
  port=${entry##* }
  if curl -fsS "http://localhost:${port}/health" >/dev/null 2>&1; then
    echo "ok    ${name} (:${port})"
  else
    echo "FAIL  ${name} (:${port})"
    fail=1
  fi
done

if [ "${fail}" -eq 0 ]; then
  echo "All services healthy."
else
  echo "One or more services are unhealthy — check 'docker compose ps' and logs."
fi
exit "${fail}"
