#!/usr/bin/env bash
#
# Build the kymo icons browser (React app) into dist/ — the deploy artifact for
# icons.kymo.studio (Cloudflare Pages project "kymo-icons").
#
# The icon ART is NOT bundled here — it's hosted on Cloudflare R2 (bucket
# `kymo-icons`, public via cdn.kymo.studio) and resolved at runtime by the app
# (CDN_BASE). The deploy stays tiny: the React bundle + the icon manifest. To
# (re)publish the art to R2 after adding/changing icons, see upload-icons.sh.
set -euo pipefail
cd "$(dirname "$0")"

ICONS=../icons # packages/icons

# esbuild + React live in node_modules; install on first run / in CI.
[[ -d node_modules ]] || npm install --no-audit --no-fund

echo "→ bundling React app"
rm -rf dist
mkdir -p dist/sets
npx esbuild src/main.tsx --bundle --format=esm --minify \
  --jsx=automatic --target=es2022 \
  --define:process.env.NODE_ENV='"production"' \
  --outfile=dist/bundle.js

echo "→ assembling dist/"
cp src/app.html dist/     # empty SPA shell — fallback for deep routes (_redirects)
cp src/styles.css dist/
cp src/_redirects dist/   # SPA rewrite for deep routes → app.html (Cloudflare Pages)
# icon catalogue (manifest paths are relative `icons/<set>/…`; resolved to the CDN at runtime)
cp "$ICONS/icons-manifest.json" dist/
cp "$ICONS/icons-collections.json" dist/
# vendored inline IconifyJSON sets (SVG body, no PNG) — rendered inline at runtime
cp "$ICONS/sets/ai.json" dist/sets/
# brand logo — used as both the favicon and the header brand mark (unified).
# Root brand assets live at <repo>/docs/brand (i.e. ../../docs from here).
cp ../../docs/brand/logo.svg dist/logo.svg

# Prerender the per-locale home shells (/, /vi/, /zh/) with translated chrome +
# hreflang/canonical and the app markup baked in. Re-renders markup only — the
# committed bundle.js is unchanged. Needs node_modules (installed above).
echo "→ prerender home shells (en / vi / zh)"
node src/prerender.mjs

# cache-bust the bundle + styles refs across every prerendered shell + app.html
V=$(date +%s)
for f in dist/index.html dist/vi/index.html dist/zh/index.html dist/app.html; do
  sed -i.bak "s|bundle.js|bundle.js?v=$V|g; s|styles.css|styles.css?v=$V|g" "$f" && rm -f "$f.bak"
done

N=$(grep -o '"[a-z0-9]*:[^"]*":' "$ICONS/icons-manifest.json" | wc -l | tr -d ' ')
echo "✓ built dist/ ($N icons via cdn.kymo.studio, $(du -sh dist | cut -f1))"
