#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
source .env
state_dir="${XDG_STATE_HOME:-$HOME/.local/state}/homeservicehelper"
mkdir -p "$state_dir"
password="$(cat .dashboard-initial-password)"
timestamp="$(date -u +%FT%TZ)"

check() {
  local name="$1" host="$2" auth="${3:-false}" code
  if [[ "$auth" == true ]]; then
    code="$(curl -ksS --resolve "${host}:443:127.0.0.1" -u "roma:${password}" -o /dev/null -w '%{http_code}' "https://${host}" || true)"
  else
    code="$(curl -ksS --resolve "${host}:443:127.0.0.1" -o /dev/null -w '%{http_code}' "https://${host}" || true)"
  fi
  printf '{"name":"%s","code":%s,"ok":%s}' "$name" "${code:-0}" "$([[ "$code" =~ ^(200|302)$ ]] && echo true || echo false)"
}

checks="$(check dashboard "home.${HOME_DOMAIN}" true),$(check cinema "cinema.${HOME_DOMAIN}"),$(check assistant "assistant.${HOME_DOMAIN}"),$(check mealie "mealie.${HOME_DOMAIN}"),$(check tasks "tasks.${HOME_DOMAIN}"),$(check things "things.${HOME_DOMAIN}"),$(check vault "vault.${HOME_DOMAIN}"),$(check status "status.${HOME_DOMAIN}")"
printf '{"generatedAt":"%s","checks":[%s]}\n' "$timestamp" "$checks" > "$state_dir/health.json"
grep -q '"ok":false' "$state_dir/health.json" && exit 1
cat "$state_dir/health.json"
