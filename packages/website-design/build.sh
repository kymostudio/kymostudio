#!/usr/bin/env bash
#
# Build the kymo brand & design-system page into dist/ — the deploy artifact for
# design.kymo.studio (Cloudflare Pages project "kymo-design").
#
# A small React app (esbuild → dist/bundle.js), matching the other kymo sites
# (packages/website, packages/website-icons). The page dogfoods the kymo design
# tokens, so the surface IS the spec. styles.css stays a plain copied file (not
# imported into TSX). Brand assets come from docs/brand — the single source of
# truth; never fork them here. build.sh bundles + assembles dist/, then
# cache-busts the bundle + stylesheet refs.
set -euo pipefail
cd "$(dirname "$0")"

BRAND=../../docs/brand # repo-root docs/brand — canonical brand assets

# esbuild + React live in node_modules; install on first run / in CI.
[[ -d node_modules ]] || npm install --no-audit --no-fund

echo "→ bundling React app"
rm -rf dist
mkdir -p dist/brand
npx esbuild src/main.tsx --bundle --format=esm --minify \
  --jsx=automatic --target=es2022 \
  --define:process.env.NODE_ENV='"production"' \
  --outfile=dist/bundle.js

echo "→ assembling dist/"

cp src/styles.css dist/
cp src/CNAME dist/
cp src/_redirects dist/   # SPA fallback for client-side routes (/foundations/*)

# site-local assets (e.g. the black logo variant) → served at /assets/…
[[ -d assets ]] && cp -R assets dist/assets

# Brand assets — copied from the canonical docs/brand set (downloadable from the
# page + used as the favicon / hero lockups). Keep this list in sync with the
# download links in index.html.
cp "$BRAND/logo.svg"            dist/brand/
cp "$BRAND/wordmark.svg"        dist/brand/
cp "$BRAND/wordmark-dark.svg"   dist/brand/
cp "$BRAND/social-preview.svg"  dist/brand/
cp "$BRAND/social-preview.png"  dist/brand/
cp "$BRAND/favicon.svg"         dist/brand/
cp "$BRAND/favicon.ico"         dist/brand/
cp "$BRAND/favicon-32.png"      dist/brand/
cp "$BRAND/favicon-48.png"      dist/brand/
cp "$BRAND/apple-touch-icon.png" dist/brand/

# favicon at the root (mirrors the other sites' <head> wiring)
cp "$BRAND/favicon.svg"          dist/favicon.svg
cp "$BRAND/favicon.ico"          dist/favicon.ico
cp "$BRAND/favicon-32.png"       dist/favicon-32.png
cp "$BRAND/favicon-48.png"       dist/favicon-48.png
cp "$BRAND/apple-touch-icon.png" dist/apple-touch-icon.png

# Prerender one static HTML per locale × page (en at root, vi/zh under a path
# prefix), each with translated <title>/description + hreflang/canonical and the
# app markup baked in for crawlers. Re-renders markup only — the committed
# bundle.js is unchanged. Needs node_modules (installed above).
echo "→ prerender per locale × page (en / vi / zh)"
node src/prerender.mjs

# cache-bust the bundle + stylesheet refs across every prerendered page
V=$(date +%s)
while IFS= read -r f; do
  sed -i.bak "s|bundle.js|bundle.js?v=$V|g; s|styles.css|styles.css?v=$V|g" "$f" && rm -f "$f.bak"
done < <(find dist -name index.html)

echo "✓ built dist/ ($(du -sh dist | cut -f1))"
