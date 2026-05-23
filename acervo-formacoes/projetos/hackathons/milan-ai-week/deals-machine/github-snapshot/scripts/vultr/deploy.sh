#!/usr/bin/env bash
# Recurring deploy: pull, install, build, restart.
# Run on the Vultr host after pushing to main.

set -euo pipefail

INSTALL_DIR="/opt/deals-machine"
WORKER_USER="deals"

cd "$INSTALL_DIR"
sudo -u "$WORKER_USER" git pull --ff-only
sudo -u "$WORKER_USER" bash -c "cd worker && npm ci --prefer-offline --no-audit && npm run build"

systemctl restart deals-machine-worker
sleep 2
systemctl status deals-machine-worker --no-pager | head -20
curl -sf http://localhost:3000/health | head -200
echo
