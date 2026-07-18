#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
base="http://jellyfin:8096"
curl_net=(docker run --rm --network apartment-edge curlimages/curl:8.15.0 -fsS)
public="$(${curl_net[@]} "$base/System/Info/Public")"

if grep -q '"StartupWizardCompleted":true' <<<"$public"; then
  if [[ -z "$(sed -n 's/^JELLYFIN_TOKEN=//p' .env | tail -n1)" ]]; then
    echo "Jellyfin is already initialized but no dashboard token is stored; create an API key in Jellyfin." >&2
    exit 2
  fi
  echo "Jellyfin setup is already complete."
  exit 0
fi

password="$(openssl rand -base64 18 | tr -d '\n/+' | cut -c1-20)"
${curl_net[@]} -X POST "$base/Startup/Configuration" -H 'Content-Type: application/json' \
  -d '{"UICulture":"uk-UA","MetadataCountryCode":"UA","PreferredMetadataLanguage":"uk"}' >/dev/null
${curl_net[@]} -X POST "$base/Startup/User" -H 'Content-Type: application/json' \
  -d "{\"Name\":\"roma\",\"Password\":\"${password}\"}" >/dev/null
${curl_net[@]} -X POST "$base/Startup/RemoteAccess" -H 'Content-Type: application/json' \
  -d '{"EnableRemoteAccess":false,"EnableAutomaticPortMapping":false}' >/dev/null
${curl_net[@]} -X POST "$base/Startup/Complete" >/dev/null

auth="$(${curl_net[@]} -X POST "$base/Users/AuthenticateByName" \
  -H 'Content-Type: application/json' \
  -H 'Authorization: MediaBrowser Client="Our Home", Device="Server", DeviceId="homeservicehelper", Version="1.0"' \
  -d "{\"Username\":\"roma\",\"Pw\":\"${password}\"}")"
token="$(sed -n 's/.*"AccessToken":"\([^"]*\)".*/\1/p' <<<"$auth")"
test -n "$token"

for spec in 'Movies|movies|/media/movies' 'Shows|tvshows|/media/shows' 'Home Videos|homevideos|/media/home-videos'; do
  IFS='|' read -r name type path <<<"$spec"
  ${curl_net[@]} -X POST --get "$base/Library/VirtualFolders" \
    -H "X-Emby-Token: $token" \
    --data-urlencode "name=$name" --data-urlencode "collectionType=$type" --data-urlencode "paths=$path" --data-urlencode 'refreshLibrary=true' >/dev/null
done

sed -i "s/^JELLYFIN_TOKEN=.*/JELLYFIN_TOKEN=${token}/" .env
printf '%s\n' "$password" > .jellyfin-initial-password
chmod 600 .jellyfin-initial-password .env
docker compose up -d --force-recreate dashboard
echo "Jellyfin initialized with three libraries and a dashboard token."
