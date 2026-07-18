#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

bash scripts/migrate-env.sh
bash scripts/validate-config.sh
docker compose pull
docker compose up -d --build
docker compose ps
