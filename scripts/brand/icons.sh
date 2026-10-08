#!/usr/bin/env bash
# Renders the PNG app icons in public/icons/ from the SVG app icons (needs rsvg-convert).
set -euo pipefail
brand="$(dirname "$0")/../../assets/brand"
icons="$(dirname "$0")/../../public/icons"
mkdir -p "$icons"

render() { # source size output
  rsvg-convert --width "$2" --height "$2" "$brand/$1" --output "$icons/$3"
}

render app-icon.svg 192 icon-192.png
render app-icon.svg 512 icon-512.png
# Full bleed with the logo inside the safe zone: Android crops it to its own shape.
render app-icon-maskable.svg 512 icon-maskable-512.png
# iOS rounds the corners itself and fills transparent ones black, so it gets the full-bleed icon.
render app-icon-maskable.svg 180 apple-touch-icon.png
