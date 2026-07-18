#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
source .env
backup_root="${BACKUP_ROOT:-$HOME/backups/apartment-home}"
target="${OFFSITE_BACKUP_TARGET:-}"
passphrase_file="${OFFSITE_PASSPHRASE_FILE:-$HOME/.config/homeservicehelper/offsite-passphrase}"
state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/homeservicehelper"
mkdir -p "$state_dir" "$(dirname "$passphrase_file")"
umask 077

if [[ -z "$target" ]]; then
  printf '{"ok":false,"configured":false,"message":"Set OFFSITE_BACKUP_TARGET to a mounted directory or scp destination"}\n' > "$state_dir/offsite-backup.json"
  cat "$state_dir/offsite-backup.json"
  exit 0
fi
if [[ ! -s "$passphrase_file" ]]; then
  openssl rand -base64 48 > "$passphrase_file"
  chmod 600 "$passphrase_file"
fi

latest="$(find "$backup_root" -mindepth 1 -maxdepth 1 -type d | sort | tail -n1)"
[[ -n "$latest" ]] || { echo "No local backup available" >&2; exit 2; }
stamp="$(basename "$latest")"
staging="$(mktemp -d)"
trap 'rm -rf "$staging"' EXIT
archive="$staging/apartment-home-${stamp}.tar.gz.gpg"
tar -C "$backup_root" -czf - "$stamp" | gpg --batch --yes --pinentry-mode loopback --passphrase-file "$passphrase_file" --symmetric --cipher-algo AES256 --output "$archive"
gpg --batch --quiet --pinentry-mode loopback --passphrase-file "$passphrase_file" --decrypt "$archive" | tar -tzf - >/dev/null
sha256sum "$archive" > "$archive.sha256"

if [[ "$target" == *:* ]]; then
  scp -q "$archive" "$archive.sha256" "$target/"
else
  mkdir -p "$target"
  cp "$archive" "$archive.sha256" "$target/"
fi
printf '{"ok":true,"configured":true,"backup":"%s","target":"%s","generatedAt":"%s"}\n' "$stamp" "$target" "$(date -u +%FT%TZ)" > "$state_dir/offsite-backup.json"
cat "$state_dir/offsite-backup.json"
