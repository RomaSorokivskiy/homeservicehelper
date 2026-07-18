#!/usr/bin/env bash
set -euo pipefail

test -f .env || {
  echo "Missing .env; copy .env.example or run scripts/generate-secrets.sh" >&2
  exit 1
}

if grep -Eq '=(CHANGE_ME|CHANGE_ME_ARGON2_HASH)$' .env; then
  echo "Refusing to validate: placeholder secrets remain in .env" >&2
  exit 1
fi

docker compose config --quiet
echo "Compose configuration is valid."

