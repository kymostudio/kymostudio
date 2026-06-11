#!/usr/bin/env bash
# Build the React client-side editor into dist/ (static, Cloudflare Pages).
# Bundles the kymostudio JS engine + kymostudio-core wasm; the engine is a
# dynamic import so the wasm chunk only loads on the editor route, not /diagrams.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
cp web/index.html dist/index.html
cp web/index.html dist/diagrams.html
cp web/styles.css dist/styles.css
cp ../../docs/brand/favicon.svg ../../docs/brand/favicon.ico ../../docs/brand/favicon-32.png ../../docs/brand/favicon-48.png ../../docs/brand/apple-touch-icon.png dist/
printf '/* /index.html 200\n' > dist/_redirects
npx esbuild web/main.tsx --bundle --format=esm --splitting --outdir=dist \
  --loader:.wasm=binary --jsx=automatic --jsx-import-source=react \
  --target=es2022 --minify --entry-names="[name]" --chunk-names="chunks/[name]-[hash]"
# Cache-bust: Pages serves assets with max-age=14400, so version the URLs —
# browsers refetch immediately after every deploy instead of up to 4h later.
V=$(date +%s)
sed -i "s|/styles.css|/styles.css?v=$V|g; s|/main.js|/main.js?v=$V|g" dist/index.html dist/diagrams.html

echo "✓ built dist/ ($(du -sh dist | cut -f1))"
