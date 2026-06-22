#!/usr/bin/env bash
# Build the React client-side editor into dist/ (static, Cloudflare Pages).
# Bundles the kymostudio JS engine + kymostudio-core wasm; the engine is a
# dynamic import so the wasm chunk only loads on the editor route, not /diagrams.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
cp web/index.html dist/index.html
cp web/index.html dist/trash.html
cp web/index.html dist/login.html
cp web/styles.css dist/styles.css
cp web/welcome-hero.svg dist/welcome-hero.svg
# Brand wordmark/logo come from docs/brand; the editor's own favicons are the
# node-graph "K" mark (web/favicon*) so the tab icon matches icons.kymo.studio
# (which favicons /logo.svg) — the SVG favicon link points straight at logo.svg.
cp ../../docs/brand/logo.svg ../../docs/brand/wordmark.svg dist/
cp web/favicon.ico web/favicon-32.png web/favicon-48.png web/apple-touch-icon.png dist/
printf '/* /index.html 200\n' > dist/_redirects
# Chunk names embed a content hash — let browsers cache them forever; the HTML
# entry points keep the default 4h and roll the references on deploy.
printf '/chunks/*\n  Cache-Control: public, max-age=31536000, immutable\n' > dist/_headers
# Pre-bundle mermaid into ONE self-contained ESM file (no --splitting, so its
# internal per-grammar dynamic imports are inlined). Bundled by the main build
# below as a single lazy chunk — one request instead of the ~25-chunk waterfall
# the package's own lazy-loading produces (5-14 s medians on Fast 4G).
mkdir -p web/vendor
npx esbuild node_modules/mermaid/dist/mermaid.esm.min.mjs --bundle --format=esm \
  --minify --legal-comments=none --outfile=web/vendor/mermaid.bundle.mjs

# .wasm uses the FILE loader, not binary: the engine wasm becomes a separate
# hashed asset under chunks/ (immutable-cached, fetched in parallel, compiled
# while downloading via instantiateStreaming) instead of ~1 MB of extra wire
# inside the engine JS chunk.
npx esbuild web/main.tsx --bundle --format=esm --splitting --outdir=dist \
  --loader:.wasm=file --asset-names="chunks/[name]-[hash]" --public-path=/ --jsx=automatic --jsx-import-source=react \
  --target=es2022 --minify --entry-names="[name]" --chunk-names="chunks/[name]-[hash]"
# Preload main.js's statically-imported shared chunks: without this the browser
# only discovers them after downloading+parsing main.js (an extra serial network
# hop on the critical path). The engine-*.js chunk is a dynamic import — never
# preload it; share links rendered via kroki must not pay for the wasm.
# In-place edits use perl, not `sed -i`: GNU `sed -i` (CI/Linux) and BSD `sed -i`
# (macOS) disagree on the backup-suffix argument, so a bare `sed -i` breaks local
# macOS builds. `perl -i -pe` behaves identically on both.
for c in $(grep -o 'chunks/chunk-[A-Za-z0-9]*\.js' dist/main.js | sort -u); do
  perl -i -pe "s|</head>|<link rel=\"modulepreload\" href=\"/$c\" />\n  </head>|" dist/index.html dist/trash.html dist/login.html
done
# Cache-bust: Pages serves assets with max-age=14400, so version the URLs by
# CONTENT hash — browsers refetch right after a deploy that actually changed a
# file, and keep their cache across deploys that didn't. md5sum (GNU/Linux) vs
# md5 (macOS): take the 8-hex prefix of whichever is present.
if command -v md5sum >/dev/null 2>&1; then md5cmd() { md5sum; }; else md5cmd() { md5 -q; }; fi
V=$(cat dist/main.js dist/styles.css | md5cmd | cut -c1-8)
perl -i -pe "s|/styles.css|/styles.css?v=$V|g; s|/main.js|/main.js?v=$V|g" dist/index.html dist/trash.html dist/login.html

echo "✓ built dist/ ($(du -sh dist | cut -f1))"
