#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
base="http://jellyfin:8096"
curl_net=(docker run --rm --network apartment-edge curlimages/curl:8.15.0 -fsS)
public="$(${curl_net[@]} "$base/System/Info/Public")"

if grep -q '"StartupWizardCompleted":true' <<<"$public"; then
  existing_token="$(sed -n 's/^JELLYFIN_TOKEN=//p' .env | tail -n1)"
  if [[ -n "$existing_token" ]]; then
    echo "Jellyfin setup and dashboard token are already complete."
    exit 0
  fi
  test -s .jellyfin-initial-password || { echo "Jellyfin is initialized; create an API key in its dashboard." >&2; exit 2; }
  password="$(cat .jellyfin-initial-password)"
else
  password="$(openssl rand -base64 18 | tr -d '\n/+' | cut -c1-20)"
  echo "Configuring Jellyfin locale..."
  ${curl_net[@]} -X POST "$base/Startup/Configuration" -H 'Content-Type: application/json' \
    -d '{"UICulture":"uk-UA","MetadataCountryCode":"UA","PreferredMetadataLanguage":"uk"}' >/dev/null
  echo "Creating Jellyfin administrator..."
  ${curl_net[@]} -X POST "$base/Startup/User" -H 'Content-Type: application/json' \
    -d "{\"Name\":\"roma\",\"Password\":\"${password}\"}" >/dev/null
  echo "Disabling Jellyfin remote discovery..."
  ${curl_net[@]} -X POST "$base/Startup/RemoteAccess" -H 'Content-Type: application/json' \
    -d '{"EnableRemoteAccess":false,"EnableAutomaticPortMapping":false}' >/dev/null
  echo "Completing Jellyfin wizard..."
  ${curl_net[@]} -X POST "$base/Startup/Complete" >/dev/null
fi

echo "Creating dashboard integration token..."
auth="$(${curl_net[@]} -X POST "$base/Users/AuthenticateByName" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: MediaBrowser Client="Our Home", Device="Server", DeviceId="homeservicehelper", Version="1.0"' \
  -d "{\"Username\":\"roma\",\"Pw\":\"${password}\"}")"
token="$(sed -n 's/.*"AccessToken":"\([^"]*\)".*/\1/p' <<<"$auth")"
test -n "$token"

if grep -q '^JELLYFIN_TOKEN=' .env; then
  sed -i "s/^JELLYFIN_TOKEN=.*/JELLYFIN_TOKEN=${token}/" .env
else
  printf 'JELLYFIN_TOKEN=%s\n' "$token" >> .env
fi

folders="$(${curl_net[@]} "$base/Library/VirtualFolders" -H "X-Emby-Token: $token")"
for spec in 'Movies|movies|/media/movies' 'Shows|tvshows|/media/shows' 'Home Videos|homevideos|/media/home-videos'; do
  IFS='|' read -r name type path <<<"$spec"
  grep -q "\"Name\":\"${name}\"" <<<"$folders" && continue
  echo "Creating $name library..."
  ${curl_net[@]} -X POST --get "$base/Library/VirtualFolders" \
    -H "X-Emby-Token: $token" \
    --data-urlencode "name=$name" --data-urlencode "collectionType=$type" --data-urlencode "paths=$path" --data-urlencode 'refreshLibrary=true' >/dev/null
done
printf '%s\n' "$password" > .jellyfin-initial-password
chmod 600 .jellyfin-initial-password .env
docker compose up -d --force-recreate dashboard
echo "Jellyfin initialized with three libraries and a dashboard token."
