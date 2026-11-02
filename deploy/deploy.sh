#!/usr/bin/env bash
# SaniMe auf den Server bringen (SSH-Alias „sanime“, anderer per SANIME_SERVER).
#
#   deploy/deploy.sh infra                      Caddy, Postgres, Garage anlegen/aktualisieren + Backup-Cron
#   deploy/deploy.sh dev [<commit>] [--seed]    Commit (Standard: HEAD) bauen und auf DEV ausrollen
#   deploy/deploy.sh dev --arbeitsstand         aktueller Arbeitsstand inkl. nicht Committetem (nur DEV, zum Ausprobieren)
#   deploy/deploy.sh prod [<commit>] [--seed]   Standard: genau das Image, das gerade auf DEV läuft
#
# --seed spielt die Stammdaten ein (Organisation, Katalog, Ratgeber, Löschfristen) —
# beim ersten Deploy einer Umgebung und nach Katalogänderungen. DEV bekommt dabei
# zusätzlich die Kassenartikel-Platzhalter, PROD nie. Kein Testkunde, kein Seed-Admin:
# Team-Konten per server/app.sh <umgebung> run --rm backend npm run admin:anlegen -- …
#
# Ablauf: Quelle übertragen → Image auf dem Server bauen (entfällt, wenn es den
# Tag schon gibt) → migrieren → Container ersetzen und auf den Healthcheck warten.
# Rollback = alten Commit erneut deployen (Migrationen laufen nur vorwärts!).
set -euo pipefail

SERVER=${SANIME_SERVER:-sanime}
BASIS=/opt/sanime
cd "$(git rev-parse --show-toplevel)"

ZIEL=${1:-}
[ $# -gt 0 ] && shift
SEED=nein
ARBEITSSTAND=nein
REF=''
for arg in "$@"; do
  case "$arg" in
    --seed) SEED=ja ;;
    --arbeitsstand) ARBEITSSTAND=ja ;;
    -*) echo "Unbekannte Option: $arg" >&2; exit 1 ;;
    *) REF=$arg ;;
  esac
done

# Quelle als tar auf stdout: ein Commit per git archive, der Arbeitsstand als
# alle getrackten + nicht ignorierten Dateien (nie .env, ios/, node_modules).
quelle_tar() {
  local pfad=${1:-.}
  if [ "$ARBEITSSTAND" = ja ]; then
    git ls-files -z -co --exclude-standard -- "$pfad" | COPYFILE_DISABLE=1 xargs -0 tar -c --no-xattrs -f - 2>/dev/null
  else
    git archive --format=tar "$COMMIT" -- "$pfad"
  fi
}

deploy_verzeichnis_uebertragen() {
  quelle_tar deploy | ssh "$SERVER" "set -e
    rm -rf $BASIS/deploy.neu && mkdir -p $BASIS/deploy.neu
    tar -x -C $BASIS/deploy.neu --strip-components=1
    chmod +x $BASIS/deploy.neu/deploy.sh $BASIS/deploy.neu/server/*.sh
    rm -rf $BASIS/deploy && mv $BASIS/deploy.neu $BASIS/deploy"
}

aufloesen() {
  if [ "$ARBEITSSTAND" = ja ]; then
    [ "$ZIEL" = dev ] || { echo '--arbeitsstand nur für dev.' >&2; exit 1; }
    COMMIT=HEAD
    TAG="$(git rev-parse --short=12 HEAD)-a$(date +%Y%m%d%H%M)"
  else
    COMMIT=$(git rev-parse --verify "${REF:-HEAD}^{commit}")
    TAG=$(git rev-parse --short=12 "$COMMIT")
    if [ -n "$(git status --porcelain)" ]; then
      echo "Hinweis: nicht committete Änderungen werden NICHT deployt (Commit $TAG)." >&2
    fi
  fi
}

case "$ZIEL" in
  infra)
    ARBEITSSTAND=ja   # die Infra-Dateien kommen immer aus dem Arbeitsstand
    deploy_verzeichnis_uebertragen
    ssh "$SERVER" "set -e; cd $BASIS/deploy
      docker compose -f compose.infra.yml --env-file $BASIS/env/infra.env up -d --remove-orphans --wait
      docker compose -f compose.infra.yml --env-file $BASIS/env/infra.env exec -T caddy caddy reload --config /etc/caddy/Caddyfile
      cp server/backup.cron /etc/cron.d/sanime-backup && chmod 644 /etc/cron.d/sanime-backup
      docker compose -f compose.infra.yml --env-file $BASIS/env/infra.env ps --format 'table {{.Service}}\t{{.Status}}'"
    exit 0
    ;;
  dev)
    aufloesen
    ;;
  prod)
    if [ -z "$REF" ]; then
      TAG=$(ssh "$SERVER" "grep '^IMAGE_TAG=' $BASIS/env/dev.release | cut -d= -f2")
      case "$TAG" in *-a*) echo "Auf DEV läuft ein Arbeitsstand ($TAG) — der kommt nicht nach PROD. Erst committen und auf DEV deployen." >&2; exit 1 ;; esac
      COMMIT=$TAG
      echo "PROD übernimmt das DEV-Image $TAG ($(git log -1 --format=%s "$TAG" 2>/dev/null || echo 'Commit lokal unbekannt'))."
    else
      aufloesen
    fi
    read -r -p "Wirklich auf PROD ausrollen? [ja/N] " antwort
    [ "$antwort" = ja ] || { echo 'Abgebrochen.'; exit 1; }
    ;;
  *)
    sed -n '2,16p' "$0" | sed 's/^# \{0,1\}//'
    exit 1
    ;;
esac

echo "== $ZIEL ← sanime-backend:$TAG"

if ssh "$SERVER" "docker image inspect sanime-backend:$TAG >/dev/null 2>&1"; then
  echo '== Image gibt es schon, kein Build'
else
  echo '== Quelle übertragen'
  quelle_tar . | ssh "$SERVER" "set -e; rm -rf $BASIS/releases/$TAG; mkdir -p $BASIS/releases/$TAG; tar -x -C $BASIS/releases/$TAG"
  echo '== Image bauen (auf dem Server, dauert beim ersten Mal einige Minuten)'
  ssh "$SERVER" "cd $BASIS/releases/$TAG && docker build -q -f deploy/backend.Dockerfile --build-arg RELEASE=$TAG -t sanime-backend:$TAG ."
fi
[ "$ZIEL" = dev ] && deploy_verzeichnis_uebertragen

SEEDS='npx tsx src/db/seed/organizations.seed.ts && npx tsx src/db/seed/catalog.seed.ts && npx tsx src/db/seed/qa.seed.ts && npx tsx src/db/seed/retention-policy.seed.ts'
# DEV: Kassenartikel-Platzhalter (der Seed prüft NODE_ENV, nur er läuft als development).
SEED_ENV=''
[ "$ZIEL" = dev ] && SEED_ENV='-e NODE_ENV=development'

ssh "$SERVER" "set -euo pipefail
  test -s $BASIS/env/$ZIEL.env || { echo 'Umgebung fehlt — zuerst: $BASIS/deploy/server/umgebung-anlegen.sh $ZIEL' >&2; exit 1; }
  cd $BASIS/deploy
  printf 'UMGEBUNG=%s\nIMAGE_TAG=%s\n' $ZIEL $TAG > $BASIS/env/$ZIEL.release.neu
  APP='docker compose -p sanime-$ZIEL -f compose.app.yml --env-file $BASIS/env/$ZIEL.release.neu'
  echo '== Migration'
  \$APP run --rm -T backend npx drizzle-kit migrate
  if [ $SEED = ja ]; then
    echo '== Stammdaten'
    \$APP run --rm -T $SEED_ENV backend sh -c '$SEEDS'
  fi
  echo '== Container ersetzen'
  \$APP up -d --force-recreate --wait --wait-timeout 180
  mv $BASIS/env/$ZIEL.release.neu $BASIS/env/$ZIEL.release
  echo '== Aufräumen (letzte 5 Images/Quellen bleiben)'
  IN_BENUTZUNG=\$(cat $BASIS/env/*.release 2>/dev/null | sed -n 's/^IMAGE_TAG=//p')
  docker images sanime-backend --format '{{.Tag}}' | tail -n +6 | while read -r t; do
    echo \"\$IN_BENUTZUNG\" | grep -qx \"\$t\" || docker rmi -f sanime-backend:\$t >/dev/null || true
  done
  ls -1t $BASIS/releases | tail -n +6 | while read -r r; do rm -rf $BASIS/releases/\$r; done
  docker builder prune -f --filter until=168h >/dev/null
  echo \"== $ZIEL läuft: \$(docker ps --filter label=com.docker.compose.project=sanime-$ZIEL --format '{{.Image}} {{.Status}}')\""
