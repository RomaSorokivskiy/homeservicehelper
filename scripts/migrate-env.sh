#!/usr/bin/env bash
set -euo pipefail

env_file="${1:-.env}"
test -f "$env_file"

if grep -q '^VIKUNJA_JWT_SECRET=' "$env_file" && ! grep -q '^VIKUNJA_SECRET=' "$env_file"; then
  sed -i 's/^VIKUNJA_JWT_SECRET=/VIKUNJA_SECRET=/' "$env_file"
fi

if ! grep -q '^HOMEBOX_API_KEY_PEPPER=' "$env_file"; then
  printf 'HOMEBOX_API_KEY_PEPPER=%s\n' "$(openssl rand -base64 48 | tr -d '\n')" >> "$env_file"
fi

chmod 600 "$env_file"
echo "Environment schema is current."
