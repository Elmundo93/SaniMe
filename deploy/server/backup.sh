#!/usr/bin/env bash
# Tägliches Backup (Cron: server/backup.cron): Postgres je Umgebung, Garage-Daten
# und die Server-Geheimnisse. 14 Tage, /opt/sanime/backups (nur root).
# ⚠️ Liegt auf derselben Platte — für echte Kundendaten zusätzlich offsite
# sichern (Hetzner Storage Box oder Server-Backups).
set -euo pipefail
ZIEL=/opt/sanime/backups/$(date +%F)
install -d -m 700 "$ZIEL"

for db in $(docker exec sanime-infra-postgres-1 psql -U postgres -qtA -c "select datname from pg_database where datname like 'sanime_%'"); do
  docker exec sanime-infra-postgres-1 pg_dump -U postgres -Fc "$db" > "$ZIEL/$db.dump"
done

docker exec -e RUST_LOG=warn sanime-infra-garage-1 /garage meta snapshot >/dev/null 2>&1 || true
docker run --rm -v sanime-infra_garage-meta:/meta:ro -v sanime-infra_garage-data:/data:ro -v "$ZIEL":/ziel \
  alpine:3.22 tar -czf /ziel/garage.tar.gz -C / meta data

tar -czf "$ZIEL/env.tar.gz" -C /opt/sanime env
chmod 600 "$ZIEL"/*

find /opt/sanime/backups -mindepth 1 -maxdepth 1 -type d -mtime +14 -exec rm -rf {} +
echo "$(date -Is) Backup ok: $(du -sh "$ZIEL" | cut -f1)"
