#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
source .env
state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/homeservicehelper"
mkdir -p "$state_dir"
timestamp="$(date -u +%FT%TZ)"
images=(CADDY_IMAGE COREDNS_IMAGE POSTGRES_IMAGE MEALIE_IMAGE VIKUNJA_IMAGE HOMEBOX_IMAGE VAULTWARDEN_IMAGE UPTIME_KUMA_IMAGE JELLYFIN_IMAGE HOME_ASSISTANT_IMAGE)
printf '{"generatedAt":"%s","images":[' "$timestamp" > "$state_dir/updates.json"
first=true
for variable in "${images[@]}"; do
  image="${!variable}"
  before="$(docker image inspect "$image" --format '{{index .RepoDigests 0}}' 2>/dev/null || true)"
  after_digest="$(docker buildx imagetools inspect "$image" --format '{{json .Manifest.Digest}}' 2>/dev/null | tr -d '"' || true)"
  after="${image%@*}@${after_digest}"
  $first || printf ',' >> "$state_dir/updates.json"; first=false
  printf '{"variable":"%s","image":"%s","installed":"%s","available":"%s","changed":%s}' "$variable" "$image" "$before" "$after" "$([[ "$before" != "$after" ]] && echo true || echo false)" >> "$state_dir/updates.json"
done
printf ']}\n' >> "$state_dir/updates.json"
cat "$state_dir/updates.json"
