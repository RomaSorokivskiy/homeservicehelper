#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

bash scripts/migrate-env.sh
bash scripts/validate-config.sh
media_root="$(awk -F= '/^MEDIA_ROOT=/{print substr($0,index($0,"=")+1)}' .env | tail -n1)"
if [[ -n "${media_root}" ]]; then
  docker run --rm -v "${media_root}:/media" alpine:3.22 sh -c 'mkdir -p /media/movies /media/shows /media/home-videos && chmod 755 /media'
fi
docker compose pull
docker compose up -d --build
docker compose restart caddy
docker compose ps
