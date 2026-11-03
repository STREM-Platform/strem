#!/usr/bin/env bash
# Nightly Postgres backup on the server (#21): every database in one compressed
# dump, kept for 7 days in /srv/strem/backups. Restore one with:
#   gunzip -c backups/strem-YYYY-MM-DD.sql.gz | docker compose -f docker-compose.yml \
#     -f docker-compose.prod.yml exec -T postgres psql -U strem -d postgres
set -euo pipefail

cd /srv/strem
out="backups/strem-$(date +%F).sql.gz"
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T postgres \
  pg_dumpall -U "$(grep '^POSTGRES_USER=' .env | cut -d= -f2)" | gzip >"$out.tmp"
mv "$out.tmp" "$out"
find backups -name 'strem-*.sql.gz' -mtime +7 -delete
echo "$(date -Is) backup ok: $out ($(du -h "$out" | cut -f1))"
