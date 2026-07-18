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

set_default() {
  local key="$1" value="$2"
  grep -q "^${key}=" "$env_file" || printf '%s=%s\n' "$key" "$value" >> "$env_file"
}

lan_ip="$(ip -4 route get 1.1.1.1 | awk '{for (i=1; i<=NF; i++) if ($i == "src") {print $(i+1); exit}}')"
gateway="$(ip -4 route show default | awk 'NR == 1 {print $3}')"
set_default LAN_IP "$lan_ip"
set_default UPSTREAM_DNS "$gateway"
set_default COREDNS_IMAGE "coredns/coredns:1.14.4"

if grep -q '^CADDY_HTTPS_PORT=8443$' "$env_file"; then
  sed -i 's/^CADDY_HTTPS_PORT=8443$/CADDY_HTTPS_PORT=443/' "$env_file"
fi

chmod 600 "$env_file"
echo "Environment schema is current."
