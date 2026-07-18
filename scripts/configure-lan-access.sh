#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

test -f .env || bash scripts/generate-secrets.sh
bash scripts/migrate-env.sh
bash scripts/validate-config.sh

set -a
# shellcheck disable=SC1091
source .env
set +a

for port in 53 443; do
  if ss -H -lntu | awk '{print $5}' | grep -Eq "^${LAN_IP}:${port}$"; then
    expected_service=coredns
    [ "$port" = 443 ] && expected_service=caddy
    if ! docker ps --filter "label=com.docker.compose.project=apartment-home" \
      --filter "label=com.docker.compose.service=${expected_service}" -q | grep -q .; then
      echo "${LAN_IP}:${port} is already in use; refusing to replace an unknown service." >&2
      exit 20
    fi
  fi
done

docker compose pull coredns caddy
docker compose up -d coredns caddy

for host in home mealie tasks things vault status; do
  code="$(curl -ksS --max-time 15 --resolve "${host}.${HOME_DOMAIN}:443:${LAN_IP}" -o /dev/null -w '%{http_code}' "https://${host}.${HOME_DOMAIN}/" || true)"
  printf '%-8s %s\n' "$host" "$code"
done

cat <<EOF

LAN access is ready on ${LAN_IP}.
Set the router DHCP/LAN DNS server to ${LAN_IP}, reconnect client devices,
then open https://home.${HOME_DOMAIN}/.

Do not expose DNS port 53 or these private services to the internet.
EOF
