#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
docker compose exec -T jellyfin test -e /dev/dri/renderD128
docker compose exec -T jellyfin sed -i \
  -e 's#<HardwareAccelerationType>.*</HardwareAccelerationType>#<HardwareAccelerationType>qsv</HardwareAccelerationType>#' \
  -e 's#<QsvDevice />#<QsvDevice>/dev/dri/renderD128</QsvDevice>#' \
  /config/config/encoding.xml
docker compose restart jellyfin

docker compose exec -T jellyfin /usr/lib/jellyfin-ffmpeg/ffmpeg -hide_banner -loglevel error \
  -init_hw_device qsv=hw:/dev/dri/renderD128 -filter_hw_device hw \
  -f lavfi -i testsrc2=size=1280x720:rate=30 -vf format=nv12,hwupload \
  -c:v h264_qsv -t 2 -f null -

echo "Intel Quick Sync H.264 encode test passed and Jellyfin QSV is enabled."
