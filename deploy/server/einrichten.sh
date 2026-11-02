#!/usr/bin/env bash
# Grundeinrichtung des SaniMe-Servers (Ubuntu 26.04, Hetzner). Idempotent —
# darf jederzeit erneut laufen. Ausführen als root auf dem Server:
#   ssh sanime 'bash -s' < deploy/server/einrichten.sh
#
# Danach: deploy/deploy.sh infra, dann je Umgebung deploy/server/umgebung-anlegen.sh.
set -euo pipefail

BASIS=/opt/sanime
export DEBIAN_FRONTEND=noninteractive

echo '== Swap (2 GB) — der Server hat nur 2 GB RAM, Image-Builds brauchen Luft'
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >/dev/null
  swapon /swapfile
  grep -q '^/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi
echo 'vm.swappiness=10' > /etc/sysctl.d/99-sanime.conf
sysctl -q -p /etc/sysctl.d/99-sanime.conf

echo '== Pakete (Docker aus den Ubuntu-Quellen → Sicherheitsupdates über unattended-upgrades)'
apt-get update -qq
apt-get install -y -qq docker.io docker-compose-v2 docker-buildx ufw unattended-upgrades >/dev/null
cat > /etc/apt/apt.conf.d/20auto-upgrades <<'EOF'
APT::Periodic::Update-Package-Lists "1";
APT::Periodic::Unattended-Upgrade "1";
EOF

echo '== Docker: Logs rotieren, Live-Restore'
mkdir -p /etc/docker
cat > /etc/docker/daemon.json <<'EOF'
{
  "log-driver": "local",
  "log-opts": { "max-size": "10m", "max-file": "5" },
  "live-restore": true
}
EOF
systemctl enable --now docker >/dev/null
systemctl restart docker

echo '== Firewall: nur SSH, HTTP, HTTPS (Docker-Ports umgehen ufw — deshalb veröffentlicht nur Caddy Ports)'
ufw default deny incoming >/dev/null
ufw default allow outgoing >/dev/null
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable >/dev/null

echo '== SSH: nur Schlüssel'
cat > /etc/ssh/sshd_config.d/10-sanime.conf <<'EOF'
PasswordAuthentication no
KbdInteractiveAuthentication no
PermitRootLogin prohibit-password
EOF
sshd -t
systemctl reload ssh

echo '== Verzeichnisse'
mkdir -p "$BASIS"/{releases,deploy,backups}
install -d -m 700 "$BASIS/env"

echo '== Infra-Geheimnisse (fehlende Werte werden ergänzt, vorhandene nie überschrieben)'
INFRA_ENV="$BASIS/env/infra.env"
umask 077
[ -f "$INFRA_ENV" ] || echo "# Erzeugt von einrichten.sh am $(date -I). Nur auf dem Server, nie ins Repo." > "$INFRA_ENV"
ergaenze() { grep -q "^$1=" "$INFRA_ENV" || echo "$1=$2" >> "$INFRA_ENV"; }
ergaenze DOMAIN_PROD api.sanime.online
ergaenze DOMAIN_DEV api.sanime.info
ergaenze POSTGRES_PASSWORD "$(openssl rand -hex 32)"
ergaenze GARAGE_RPC_SECRET "$(openssl rand -hex 32)"
ergaenze GARAGE_ADMIN_TOKEN "$(openssl rand -hex 32)"
# Altlast des ersten Laufs (vor dem Wechsel MinIO → Garage)
sed -i '/^MINIO_ROOT_/d' "$INFRA_ENV"
umask 022

echo '== Fertig'
docker --version
docker compose version
