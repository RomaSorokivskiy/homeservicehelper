#!/usr/bin/env bash
set -euo pipefail

repo="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
unit_dir="$HOME/.config/systemd/user"
mkdir -p "$unit_dir"

cat > "$unit_dir/homeservicehelper-health.service" <<EOF
[Unit]
Description=Check apartment services
[Service]
Type=oneshot
WorkingDirectory=$repo
ExecStart=$repo/scripts/health-report.sh
EOF

cat > "$unit_dir/homeservicehelper-health.timer" <<'EOF'
[Unit]
Description=Check apartment services every five minutes
[Timer]
OnBootSec=2min
OnUnitActiveSec=5min
Persistent=true
[Install]
WantedBy=timers.target
EOF

cat > "$unit_dir/homeservicehelper-backup.service" <<EOF
[Unit]
Description=Back up apartment services
[Service]
Type=oneshot
WorkingDirectory=$repo
Environment=BACKUP_ROOT=$HOME/backups/apartment-home
ExecStart=$repo/scripts/backup.sh
EOF

cat > "$unit_dir/homeservicehelper-backup.timer" <<'EOF'
[Unit]
Description=Daily apartment backup
[Timer]
OnCalendar=*-*-* 03:20:00
Persistent=true
[Install]
WantedBy=timers.target
EOF

cat > "$unit_dir/homeservicehelper-restore-drill.service" <<EOF
[Unit]
Description=Verify latest apartment backup
[Service]
Type=oneshot
WorkingDirectory=$repo
ExecStart=/bin/bash -lc 'latest=\$(find "$HOME/backups/apartment-home" -mindepth 1 -maxdepth 1 -type d | sort | tail -n1); "$repo/scripts/verify-backup.sh" "\$latest"'
EOF

cat > "$unit_dir/homeservicehelper-restore-drill.timer" <<'EOF'
[Unit]
Description=Weekly apartment restore drill
[Timer]
OnCalendar=Sun *-*-* 04:20:00
Persistent=true
[Install]
WantedBy=timers.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now homeservicehelper-health.timer homeservicehelper-backup.timer homeservicehelper-restore-drill.timer
echo "Maintenance timers installed."
