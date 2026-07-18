#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
docker run --rm --user "$(id -u):$(id -g)" --network apartment-edge -v "$PWD:/work" -w /work node:22-alpine node scripts/bootstrap-home-assistant.mjs
chmod 600 .env .home-assistant-initial-password 2>/dev/null || true
docker compose up -d --force-recreate dashboard
