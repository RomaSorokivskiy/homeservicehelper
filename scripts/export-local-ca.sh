#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
output="${1:-caddy-local-root.crt}"

container_id="$(docker compose ps -q caddy)"
test -n "$container_id" || {
  echo "Caddy is not running." >&2
  exit 1
}

docker cp "${container_id}:/data/caddy/pki/authorities/local/root.crt" "$output"
chmod 644 "$output"
echo "Exported local CA certificate to $output"
