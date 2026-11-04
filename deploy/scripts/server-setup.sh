#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu server for STREM (#21): Oracle Cloud Always
# Free (Ampere A1) or a Hetzner VPS. Run it once as the login user (ubuntu):
#
#   curl -fsSL https://raw.githubusercontent.com/baldzhiyski/strem/main/deploy/scripts/server-setup.sh | bash
#
# It installs Docker, opens ports 80/443, creates /srv/strem with a .env whose
# secrets are generated here (never leave the server), and schedules the nightly
# database backup. Deploys themselves come from .github/workflows/deploy.yml.
set -euo pipefail

DIR=/srv/strem

if ! command -v docker >/dev/null; then
  curl -fsSL https://get.docker.com | sudo sh
  sudo usermod -aG docker "$USER"
fi

# Oracle's Ubuntu images reject everything but SSH in iptables, even when the
# cloud security list allows it. Open HTTP/HTTPS (no-op elsewhere).
if sudo iptables -C INPUT -j REJECT --reject-with icmp-host-prohibited 2>/dev/null; then
  for port in 80 443; do
    sudo iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null ||
      sudo iptables -I INPUT 5 -p tcp --dport "$port" -j ACCEPT
  done
  sudo iptables -C INPUT -p udp --dport 443 -j ACCEPT 2>/dev/null ||
    sudo iptables -I INPUT 5 -p udp --dport 443 -j ACCEPT
  sudo netfilter-persistent save
fi

sudo mkdir -p "$DIR/backups"
sudo chown -R "$USER":"$USER" "$DIR"

if [ ! -f "$DIR/.env" ]; then
  secret() { openssl rand -base64 48 | tr -d '\n/+=' | cut -c1-48; }
  fernet() { openssl rand -base64 32 | tr '+/' '-_'; }
  cat >"$DIR/.env" <<EOF
API_DOMAIN=
WEB_ORIGIN=
POSTGRES_USER=strem
POSTGRES_PASSWORD=$(secret)
POSTGRES_DB=strem
JWT_SECRET=$(secret)
INTEGRATIONS_ENCRYPTION_KEY=$(fernet)
AI_PROVIDER=openai
OPENAI_API_KEY=
OPENAI_MODEL=gpt-6.1-sol
ANTHROPIC_API_KEY=
AI_DAILY_LIMIT=60
STRAVA_CLIENT_ID=
STRAVA_CLIENT_SECRET=
STRAVA_REDIRECT_URI=
EOF
  chmod 600 "$DIR/.env"
  echo "Created $DIR/.env: fill in API_DOMAIN, WEB_ORIGIN, OPENAI_API_KEY and Strava."
fi

# Nightly backup at 03:15 server time; the deploy copies backup-db.sh into $DIR.
( crontab -l 2>/dev/null | grep -v backup-db.sh; echo "15 3 * * * $DIR/backup-db.sh >> $DIR/backups/backup.log 2>&1" ) | crontab -

echo "Done. Log out and back in once so the docker group applies."
