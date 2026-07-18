#!/usr/bin/env bash
set -euo pipefail

backup="${1:?usage: scripts/verify-backup.sh /path/to/backup}"
test -f "${backup}/SHA256SUMS"
(cd "$backup" && sha256sum --check SHA256SUMS)

stamp="$(date +%s)"
for volume in mealie_data homebox_data vaultwarden_data jellyfin_config home_assistant_config household_state_data; do
  archive="${backup}/${volume}.tar.gz"
  test -s "$archive"
  drill_volume="apartment_restore_drill_${volume}_${stamp}"
  docker volume create "$drill_volume" >/dev/null
  docker run --rm -v "${drill_volume}:/restore" -v "${backup}:/backup:ro" alpine:3.22 \
    sh -c "tar -C /restore -xzf /backup/${volume}.tar.gz && find /restore -mindepth 1 -print -quit | grep -q ."
  docker volume rm "$drill_volume" >/dev/null
done

docker run --rm -v "${backup}:/backup:ro" postgres:17.6-alpine pg_restore --list /backup/mealie.dump >/dev/null
docker run --rm -v "${backup}:/backup:ro" postgres:17.6-alpine pg_restore --list /backup/vikunja.dump >/dev/null
echo "Backup checksums, archives, and PostgreSQL dumps passed the restore drill."
