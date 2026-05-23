#!/usr/bin/env bash
# Deals Machine — Vultr Ubuntu 24.04 bootstrap
# One-time setup. Run as root on a freshly-provisioned 199.247.20.213.
#
# Usage (from local Mac):
#   scp scripts/vultr/bootstrap.sh root@199.247.20.213:/root/
#   ssh root@199.247.20.213 'bash /root/bootstrap.sh'
#
# Idempotent: safe to re-run.

set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/kyletdow47/deals-machine.git}"
BRANCH="${BRANCH:-feat/overnight-build}"
INSTALL_DIR="/opt/deals-machine"
NODE_VERSION="20"
WORKER_USER="deals"

echo "==> 1/9 apt update + base packages"
DEBIAN_FRONTEND=noninteractive apt-get update -y
DEBIAN_FRONTEND=noninteractive apt-get upgrade -y
DEBIAN_FRONTEND=noninteractive apt-get install -y \
  build-essential curl git ufw fail2ban ca-certificates gnupg lsb-release \
  unattended-upgrades htop

echo "==> 2/9 swap (1GB host needs a swap file)"
if ! swapon --show | grep -q '/swapfile'; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

echo "==> 3/9 service user"
id -u "$WORKER_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$WORKER_USER"

echo "==> 4/9 Node ${NODE_VERSION} via NodeSource"
if ! command -v node >/dev/null 2>&1 || ! node -v | grep -q "^v${NODE_VERSION}\."; then
  curl -fsSL "https://deb.nodesource.com/setup_${NODE_VERSION}.x" | bash -
  DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
fi
node -v
npm -v

echo "==> 5/9 Caddy (reverse proxy + Let's Encrypt)"
if ! command -v caddy >/dev/null 2>&1; then
  DEBIAN_FRONTEND=noninteractive apt-get install -y debian-keyring debian-archive-keyring apt-transport-https curl
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y caddy
fi

echo "==> 6/9 firewall (idempotent — only adds rules if missing)"
ufw allow 22/tcp comment 'ssh' >/dev/null 2>&1 || true
ufw allow 80/tcp comment 'http (le challenge)' >/dev/null 2>&1 || true
ufw allow 443/tcp comment 'https' >/dev/null 2>&1 || true
if ! ufw status | grep -q "Status: active"; then
  ufw default deny incoming
  ufw default allow outgoing
  ufw --force enable
fi

echo "==> 7/9 clone repo (branch: $BRANCH)"
if [ ! -d "$INSTALL_DIR/.git" ]; then
  # Dir may exist as empty placeholder — clone into a temp path and move into place.
  mkdir -p "$INSTALL_DIR"
  if [ -z "$(ls -A "$INSTALL_DIR")" ]; then
    rmdir "$INSTALL_DIR"
    git clone -b "$BRANCH" "$REPO_URL" "$INSTALL_DIR"
  else
    echo "ERROR: $INSTALL_DIR exists and is non-empty but not a git repo. Manual cleanup required." >&2
    exit 1
  fi
else
  cd "$INSTALL_DIR"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git pull --ff-only origin "$BRANCH"
  cd - >/dev/null
fi
chown -R "$WORKER_USER":"$WORKER_USER" "$INSTALL_DIR"

echo "==> 8/9 placeholder env (real secrets pasted manually)"
if [ ! -f /etc/deals-machine.env ]; then
  touch /etc/deals-machine.env
  chmod 600 /etc/deals-machine.env
  chown "$WORKER_USER":"$WORKER_USER" /etc/deals-machine.env
  echo "# Paste real env vars from worker/.env.example template"  >  /etc/deals-machine.env
fi

echo "==> 9/9 install worker deps (tsx runs TypeScript directly — no build step)"
sudo -u "$WORKER_USER" bash -c "cd $INSTALL_DIR/worker && npm ci"

cat <<EOF

==========================================================================
 Bootstrap complete.

 NEXT STEPS:
   1. Paste real env vars into /etc/deals-machine.env (chmod 600)
      Template: worker/.env.example
   2. Install systemd service:
        bash $INSTALL_DIR/scripts/vultr/install-service.sh
   3. Install Caddy site config:
        cp $INSTALL_DIR/scripts/vultr/Caddyfile /etc/caddy/Caddyfile
        systemctl reload caddy
   4. Verify:
        systemctl status deals-machine-worker
        curl https://worker.kyletdow.com/health

 DNS check: dig +short worker.kyletdow.com  (must return 199.247.20.213)
==========================================================================
EOF
