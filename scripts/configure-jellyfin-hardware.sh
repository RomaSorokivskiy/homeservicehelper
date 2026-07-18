#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."
encoding=/config/config/encoding.xml

set_mode() {
  docker compose exec -T jellyfin sed -i \
    -e "s#<HardwareAccelerationType>.*</HardwareAccelerationType>#<HardwareAccelerationType>$1</HardwareAccelerationType>#" \
    "$encoding"
  docker compose restart jellyfin >/dev/null
}

if lspci -D | grep -q '^0000:00:02.0.*Intel.*VGA'; then
  docker compose exec -T jellyfin test -e /dev/dri/renderD128
  docker compose exec -T jellyfin sed -i \
    -e 's#<QsvDevice>.*</QsvDevice>#<QsvDevice>/dev/dri/renderD128</QsvDevice>#' \
    -e 's#<QsvDevice />#<QsvDevice>/dev/dri/renderD128</QsvDevice>#' "$encoding"
  set_mode qsv
  docker compose exec -T jellyfin /usr/lib/jellyfin-ffmpeg/ffmpeg -hide_banner -loglevel error \
    -init_hw_device vaapi=va:/dev/dri/renderD128 -init_hw_device qsv=hw@va -filter_hw_device hw \
    -f lavfi -i testsrc2=size=1280x720:rate=30 -vf format=nv12,hwupload \
    -c:v h264_qsv -t 2 -f null -
  echo "Intel Quick Sync encode test passed."
elif command -v nvidia-smi >/dev/null && nvidia-smi >/dev/null 2>&1; then
  if ! docker info 2>/dev/null | grep -q 'nvidia'; then
    set_mode none
    echo "GTX 1650 detected, but NVIDIA Container Toolkit is not installed; Jellyfin remains in software mode." >&2
    exit 2
  fi
  set_mode nvenc
  docker compose exec -T jellyfin /usr/lib/jellyfin-ffmpeg/ffmpeg -hide_banner -loglevel error \
    -f lavfi -i testsrc2=size=1280x720:rate=30 -c:v h264_nvenc -t 2 -f null -
  echo "NVIDIA NVENC encode test passed."
else
  set_mode none
  echo "No supported hardware encoder is available; Jellyfin remains in software mode." >&2
  exit 2
fi
