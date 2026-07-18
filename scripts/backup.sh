#!/usr/bin/env bash
set -euo pipefail

backup_root="${BACKUP_ROOT:-/srv/backups/apartment-home}"
stamp="$(date -u +%Y%m%dT%H%M%SZ)"
target="${backup_root}/${stamp}"
mkdir -p "$target"
umask 077

docker compose exec -T mealie-db pg_dump -U mealie -d mealie -Fc > "${target}/mealie.dump"
docker compose exec -T vikunja-db pg_dump -U vikunja -d vikunja -Fc > "${target}/vikunja.dump"

for volume in mealie_data vikunja_files homebox_data vaultwarden_data caddy_data uptime_kuma_data jellyfin_config home_assistant_config household_state_data; do
  docker run --rm -v "apartment-home_${volume}:/source:ro" -v "${target}:/backup" alpine:3.22 \
    tar -C /source -czf "/backup/${volume}.tar.gz" .
done

sha256sum "${target}"/* > "${target}/SHA256SUMS"
git rev-parse HEAD > "${target}/REPOSITORY_COMMIT"
docker compose images --format json > "${target}/IMAGES.json"
find "$backup_root" -mindepth 1 -maxdepth 1 -type d -mtime +30 -print

echo "Backup created at ${target}. Old backups were listed, not deleted."
