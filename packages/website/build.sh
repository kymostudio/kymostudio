#!/usr/bin/env bash
#
# Build the kymostudio website into dist/ (the deploy artifact for kymo.studio).
#
#   dist/index.html  styles.css  landing.bundle.js  favicons  CNAME  .nojekyll  ← landing (src/)
#   dist/app/index.html  kymo.bundle.js                                         ← playground (app/)
#
# The landing is a small React app (src/landing/main.tsx) bundled into the
# COMMITTED src/landing.bundle.js — the same convention as the playground's
# app/kymo.bundle.js, so a normal deploy never recompiles JS. Pass --bundle to
# rebuild both bundles (landing needs this dir's node_modules; the playground
# additionally needs a healthy packages/js build).
set -euo pipefail
cd "$(dirname "$0")"

if [[ "${1:-}" == "--bundle" ]]; then
  echo "→ rebuilding landing bundle (src/landing → src/landing.bundle.js)"
  [[ -d node_modules ]] || npm install --no-audit --no-fund
  npx esbuild src/landing/main.tsx --bundle --format=esm --minify \
    --jsx=automatic --target=es2022 --outfile=src/landing.bundle.js
  echo "→ rebuilding playground bundle (app/build.sh)"
  ( cd app && ./build.sh )
fi

[[ -f src/landing.bundle.js ]] || { echo "✗ src/landing.bundle.js missing — run: ./build.sh --bundle" >&2; exit 1; }
[[ -f app/kymo.bundle.js ]] || { echo "✗ app/kymo.bundle.js missing — run: ./build.sh --bundle" >&2; exit 1; }

echo "→ cleaning dist/"
rm -rf dist
mkdir -p dist/app

echo "→ landing  (src/ → dist/)"
cp src/index.html src/styles.css src/landing.bundle.js src/CNAME src/.nojekyll dist/

echo "→ brand assets  (docs/brand → dist/)"
cp ../../docs/brand/logo.svg ../../docs/brand/favicon.svg ../../docs/brand/favicon-32.png \
   ../../docs/brand/favicon-48.png ../../docs/brand/favicon.ico ../../docs/brand/apple-touch-icon.png dist/

# Cache-bust: Pages serves assets with max-age=14400, so version the URLs —
# browsers refetch immediately after every deploy instead of up to 4h later.
V=$(date +%s)
sed -i.bak "s|/styles.css|/styles.css?v=$V|g; s|/landing.bundle.js|/landing.bundle.js?v=$V|g" dist/index.html && rm -f dist/index.html.bak

echo "→ playground  (app/ → dist/app/)"
cp app/index.html app/kymo.bundle.js dist/app/

echo "✓ built dist/ ($(find dist -type f | wc -l | tr -d " ") files, $(du -sh dist | cut -f1))"
