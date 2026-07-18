#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
test -f .env

set_key() {
  local key="$1" value="$2"
  if grep -q "^${key}=" .env; then sed -i "s|^${key}=.*$|${key}=${value}|" .env
  else printf '%s=%s\n' "$key" "$value" >> .env; fi
}

read -rsp "Mealie API token: " mealie_token; echo; set_key MEALIE_TOKEN "$mealie_token"
read -rsp "Vikunja API token: " vikunja_token; echo; set_key VIKUNJA_TOKEN "$vikunja_token"
read -rsp "Homebox API token: " homebox_token; echo; set_key HOMEBOX_TOKEN "$homebox_token"

mealie_list_id="$(curl -ksS --resolve mealie.home.arpa:443:127.0.0.1 \
  -H "Authorization: Bearer ${mealie_token}" https://mealie.home.arpa/api/households/shopping/lists |
  python3 -c 'import json,sys; d=json.load(sys.stdin); a=d.get("items",d) if isinstance(d,dict) else d; print(a[0]["id"] if a else "")')"
vikunja_project_id="$(curl -ksS --resolve tasks.home.arpa:443:127.0.0.1 \
  -H "Authorization: Bearer ${vikunja_token}" 'https://tasks.home.arpa/api/v1/projects?per_page=50' |
  python3 -c 'import json,sys; a=json.load(sys.stdin); p=next((x for x in a if not x.get("is_archived") and x.get("id",0)>0), None); print(p["id"] if p else "")')"

test -n "$mealie_list_id" || { echo "No Mealie shopping list found. Create one and rerun." >&2; exit 2; }
test -n "$vikunja_project_id" || { echo "No Vikunja project found. Create one and rerun." >&2; exit 3; }
set_key MEALIE_SHOPPING_LIST_ID "$mealie_list_id"
set_key VIKUNJA_PROJECT_ID "$vikunja_project_id"
chmod 600 .env
docker compose up -d --build dashboard mealie vikunja homebox vaultwarden
echo "Integrations saved and dashboard restarted."
