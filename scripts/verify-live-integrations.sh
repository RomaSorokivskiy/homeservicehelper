#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."
docker run --rm --network apartment-edge -v "$PWD:/work:ro" -w /work node:22-alpine node scripts/verify-live-integrations.mjs
