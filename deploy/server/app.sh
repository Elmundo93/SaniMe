#!/usr/bin/env bash
# docker compose für eine Umgebung, ohne die Parameter jedes Mal zu tippen:
#   /opt/sanime/deploy/server/app.sh dev logs -f --tail 200
#   /opt/sanime/deploy/server/app.sh prod ps
#   /opt/sanime/deploy/server/app.sh prod run --rm backend npm run admin:anlegen -- <email> "<Name>" <rolle>
#   /opt/sanime/deploy/server/app.sh dev run --rm backend npm run versorgung:status -- AntragVersendet
set -euo pipefail
UMGEBUNG=${1:-}
case "$UMGEBUNG" in dev|prod) ;; *) echo "Aufruf: $0 dev|prod <docker-compose-befehl …>" >&2; exit 1 ;; esac
shift
exec docker compose -p "sanime-$UMGEBUNG" -f /opt/sanime/deploy/compose.app.yml \
  --env-file "/opt/sanime/env/$UMGEBUNG.release" "$@"
