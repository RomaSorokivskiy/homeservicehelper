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
OnActiveSec=2min
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

cat > "$unit_dir/homeservicehelper-slo.service" <<EOF
[Unit]
Description=Calculate 30-day apartment availability SLO
[Service]
Type=oneshot
WorkingDirectory=$repo
ExecStart=/usr/bin/docker run --rm -v $repo:/repo:ro -v $HOME/.local/state/homeservicehelper:/state:ro node:22-alpine node /repo/scripts/slo-report.mjs /state/health-history.jsonl
EOF

cat > "$unit_dir/homeservicehelper-slo.timer" <<'EOF'
[Unit]
Description=Calculate apartment SLO weekly
[Timer]
OnCalendar=Sun *-*-* 05:00:00
Persistent=true
[Install]
WantedBy=timers.target
EOF

cat > "$unit_dir/homeservicehelper-update-check.service" <<EOF
[Unit]
Description=Check apartment container update channel without applying changes
[Service]
Type=oneshot
WorkingDirectory=$repo
ExecStart=$repo/scripts/check-updates.sh
EOF

cat > "$unit_dir/homeservicehelper-update-check.timer" <<'EOF'
[Unit]
Description=Check apartment service updates weekly
[Timer]
OnCalendar=Sat *-*-* 05:00:00
Persistent=true
[Install]
WantedBy=timers.target
EOF

systemctl --user daemon-reload
systemctl --user enable --now homeservicehelper-health.timer homeservicehelper-backup.timer homeservicehelper-restore-drill.timer homeservicehelper-slo.timer homeservicehelper-update-check.timer
systemctl --user restart homeservicehelper-health.timer homeservicehelper-backup.timer homeservicehelper-restore-drill.timer homeservicehelper-slo.timer homeservicehelper-update-check.timer
echo "Maintenance timers installed."
