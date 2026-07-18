#!/usr/bin/env bash
set -euo pipefail

env_file="${1:-.env}"

if [[ -e "$env_file" ]]; then
  echo "Refusing to overwrite $env_file" >&2
  exit 1
fi

cp .env.example "$env_file"

for key in MEALIE_POSTGRES_PASSWORD VIKUNJA_POSTGRES_PASSWORD VIKUNJA_SECRET HOMEBOX_API_KEY_PEPPER; do
  value="$(openssl rand -base64 36 | tr -d '\n')"
  sed -i "s|^${key}=CHANGE_ME$|${key}=${value}|" "$env_file"
done

echo "Created $env_file. Vaultwarden admin access is disabled by default."
