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
echo "✓ built dist/ ($(du -sh dist | cut -f1))"
