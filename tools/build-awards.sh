#!/usr/bin/env bash
# Cuts the blue Booking.com award panel out of the phone screenshots in reviews/ -> site/img/awards/*.webp
# (837x2048 screenshots; the award panel sits at y=559..1397). Better: use the official award files from the Booking.com extranet.
set -euo pipefail
cd "$(dirname "$0")/.."
mkdir -p site/img/awards
magick "reviews/image.png"      -crop 837x838+0+559 +repage -resize 640x -quality 88 -define webp:method=6 site/img/awards/award-2025.webp
magick "reviews/image copy.png" -crop 837x838+0+559 +repage -resize 640x -quality 88 -define webp:method=6 site/img/awards/award-2024.webp
identify site/img/awards/*.webp
