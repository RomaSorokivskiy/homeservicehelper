#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
test -f .env

set_key() {
  local key="$1" value="$2"
  if grep -q "^${key}=" .env; then sed -i "s|^${key}=.*$|${key}=${value}|" .env
  else printf '%s=%s\n' "$key" "$value" >> .env; fi
}

read -rsp "Mealie API token: " value; echo; set_key MEALIE_TOKEN "$value"
read -rp "Mealie shopping list ID: " value; set_key MEALIE_SHOPPING_LIST_ID "$value"
read -rsp "Vikunja API token: " value; echo; set_key VIKUNJA_TOKEN "$value"
read -rp "Vikunja project ID: " value; set_key VIKUNJA_PROJECT_ID "$value"
read -rsp "Homebox API token: " value; echo; set_key HOMEBOX_TOKEN "$value"
chmod 600 .env
docker compose up -d --build dashboard mealie vikunja homebox vaultwarden
echo "Integrations saved and dashboard restarted."
