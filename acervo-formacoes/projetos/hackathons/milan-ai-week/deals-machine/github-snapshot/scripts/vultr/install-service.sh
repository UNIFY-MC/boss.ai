#!/usr/bin/env bash
# Install the deals-machine-worker systemd unit.
# Run as root after bootstrap.sh.

set -euo pipefail

INSTALL_DIR="/opt/deals-machine"
WORKER_USER="deals"
UNIT_PATH="/etc/systemd/system/deals-machine-worker.service"

cat > "$UNIT_PATH" <<EOF
[Unit]
Description=Deals Machine Worker
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=${WORKER_USER}
Group=${WORKER_USER}
WorkingDirectory=${INSTALL_DIR}/worker
EnvironmentFile=/etc/deals-machine.env
ExecStart=${INSTALL_DIR}/worker/node_modules/.bin/tsx ${INSTALL_DIR}/worker/src/index.ts
Restart=always
RestartSec=5
StandardOutput=journal
StandardError=journal
SyslogIdentifier=deals-machine-worker

# Hardening
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=${INSTALL_DIR}/worker

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable deals-machine-worker
systemctl restart deals-machine-worker
sleep 2
systemctl status deals-machine-worker --no-pager
echo
echo "Logs: journalctl -u deals-machine-worker -f"
