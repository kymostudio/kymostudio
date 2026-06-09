#!/usr/bin/env bash
# Build the client-side editor into dist/ (static, deploy to Cloudflare Pages).
# Bundles the kymostudio JS engine + kymostudio-core wasm (inlined) so render
# runs fully in the browser. Requires packages/js built (npm run build there,
# with a fresh wasm core) and `npm install` here (file: links to js + core).
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
cp web/index.html dist/index.html
npx esbuild web/app.js --bundle --format=esm --target=es2022 \
  --loader:.wasm=binary --minify --outfile=dist/app.js
echo "✓ built dist/ ($(du -sh dist | cut -f1)) — app.js $(du -h dist/app.js | cut -f1)"
