#!/usr/bin/env bash
# Legt eine Umgebung (dev|prod) an: Postgres-Rolle + Datenbank, Garage-Schlüssel
# + Bucket und /opt/sanime/env/<umgebung>.env. Idempotent — vorhandene Werte
# bleiben, fehlende werden ergänzt. Läuft auf dem Server, die Infra muss laufen:
#   ssh sanime /opt/sanime/deploy/server/umgebung-anlegen.sh dev
set -euo pipefail

UMGEBUNG=${1:-}
case "$UMGEBUNG" in dev|prod) ;; *) echo "Aufruf: $0 dev|prod" >&2; exit 1 ;; esac

BASIS=/opt/sanime
ENV_DATEI="$BASIS/env/$UMGEBUNG.env"
DB="sanime_$UMGEBUNG"
BUCKET="sanime-$UMGEBUNG-documents"
SCHLUESSEL="sanime-$UMGEBUNG"
PG="docker exec -i -e PGOPTIONS=--client-min-messages=warning sanime-infra-postgres-1 psql -U postgres -v ON_ERROR_STOP=1 -qtA"
GARAGE="docker exec -e RUST_LOG=warn sanime-infra-garage-1 /garage"

umask 077
touch "$ENV_DATEI"
wert() { grep -E "^$1=" "$ENV_DATEI" | head -1 | cut -d= -f2- || true; }
ergaenze() { grep -q "^$1=" "$ENV_DATEI" || echo "$1=$2" >> "$ENV_DATEI"; }

echo "== $UMGEBUNG: Grundwerte"
ergaenze NODE_ENV production
ergaenze PORT 3000
ergaenze LOG_LEVEL info
ergaenze SENTRY_DSN ''
ergaenze SENTRY_ENVIRONMENT "$UMGEBUNG"
ergaenze ADMIN_JWT_SECRET "$(openssl rand -hex 48)"
ergaenze ADMIN_JWT_EXPIRES_IN 8h
ergaenze VERIFICATION_CODE_PEPPER "$(openssl rand -hex 48)"
ergaenze DB_PASSWORT "$(openssl rand -hex 32)"
ergaenze DATABASE_URL "postgres://$DB:$(wert DB_PASSWORT)@postgres:5432/$DB"

echo "== $UMGEBUNG: Postgres-Rolle und Datenbank"
DB_PASSWORT=$(wert DB_PASSWORT)
if [ "$($PG -c "select 1 from pg_roles where rolname='$DB'")" != 1 ]; then
  $PG -c "create role $DB login password '$DB_PASSWORT'"
else
  $PG -c "alter role $DB password '$DB_PASSWORT'"
fi
if [ "$($PG -c "select 1 from pg_database where datname='$DB'")" != 1 ]; then
  $PG -c "create database $DB owner $DB"
fi
# Keine Umgebung sieht die Datenbank der anderen.
$PG -c "revoke all on database $DB from public"
# pg_trgm braucht Superuser-Rechte, die Migration läuft als $DB.
$PG -d "$DB" -c "create extension if not exists pg_trgm"

echo "== $UMGEBUNG: Garage-Bucket und Schlüssel"
if ! $GARAGE layout show 2>/dev/null | grep -q 'Current cluster layout version: [1-9]'; then
  KNOTEN=$($GARAGE node id -q | cut -d@ -f1)
  $GARAGE layout assign -z fsn1 -c 20G "$KNOTEN" >/dev/null
  $GARAGE layout apply --version 1 >/dev/null
fi
if [ -z "$(wert STORAGE_ACCESS_KEY_ID)" ]; then
  # Garage-Format: GK + 24 Hex-Zeichen, Secret 64 Hex-Zeichen.
  echo "STORAGE_ACCESS_KEY_ID=GK$(openssl rand -hex 12)" >> "$ENV_DATEI"
  echo "STORAGE_SECRET_ACCESS_KEY=$(openssl rand -hex 32)" >> "$ENV_DATEI"
fi
if ! $GARAGE key info "$(wert STORAGE_ACCESS_KEY_ID)" >/dev/null 2>&1; then
  $GARAGE key import --yes -n "$SCHLUESSEL" "$(wert STORAGE_ACCESS_KEY_ID)" "$(wert STORAGE_SECRET_ACCESS_KEY)" >/dev/null
fi
$GARAGE bucket info "$BUCKET" >/dev/null 2>&1 || $GARAGE bucket create "$BUCKET" >/dev/null
$GARAGE bucket allow --read --write --owner "$BUCKET" --key "$(wert STORAGE_ACCESS_KEY_ID)" >/dev/null
ergaenze STORAGE_ENDPOINT http://garage:3900
ergaenze STORAGE_REGION garage
ergaenze STORAGE_BUCKET "$BUCKET"
ergaenze STORAGE_FORCE_PATH_STYLE true

echo "== $UMGEBUNG: externe Dienste (leer = aus; Werte trägst du selbst ein)"
for name in STRIPE_SECRET_KEY STRIPE_WEBHOOK_SECRET CATALOG_IMAGE_BASE_URL \
            TELEKOM_VERIFY_APPLICATION_ID TELEKOM_VERIFY_PRIVATE_KEY SEVEN_API_KEY \
            APNS_KEY_ID APNS_TEAM_ID APNS_PRIVATE_KEY APNS_BUNDLE_ID; do
  ergaenze "$name" ''
done
ergaenze TELEKOM_VERIFY_STILLE_PRUEFUNG false
ergaenze APNS_PRODUCTION true

chmod 600 "$ENV_DATEI"
echo "Fertig: $ENV_DATEI"
