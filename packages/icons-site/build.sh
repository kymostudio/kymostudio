#!/usr/bin/env bash
#
# Build the kymo icons gallery into dist/ (deploy artifact for icons.kymo.studio,
# Cloudflare Pages project "kymo-icons"). Static: the page + the icon manifest +
# the icon PNGs, copied straight from packages/icons. No JS compile.
set -euo pipefail
cd "$(dirname "$0")"

ICONS=../icons # packages/icons

echo "→ assembling dist/"
rm -rf dist
mkdir -p dist
cp index.html dist/
cp "$ICONS/icons-manifest.json" dist/
cp "$ICONS/icons-collections.json" dist/
# the icon art (manifest paths are icons/<set>/…)
cp -R "$ICONS/icons" dist/icons
# brand favicon (optional)
cp ../docs/brand/favicon.svg dist/favicon.svg 2>/dev/null || true

N=$(find dist/icons -type f | wc -l | tr -d ' ')
echo "✓ built dist/ ($N icons, $(du -sh dist | cut -f1))"
