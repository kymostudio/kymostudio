#!/usr/bin/env bash
# Build the React client-side editor into dist/ (static, Cloudflare Pages).
# Bundles the kymostudio JS engine + kymostudio-core wasm; the engine is a
# dynamic import so the wasm chunk only loads on the editor route, not /diagrams.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf dist && mkdir -p dist
cp web/index.html dist/index.html
cp web/index.html dist/diagrams.html
cp web/index.html dist/login.html
cp web/styles.css dist/styles.css
cp ../../docs/brand/favicon.svg ../../docs/brand/favicon.ico ../../docs/brand/favicon-32.png ../../docs/brand/favicon-48.png ../../docs/brand/apple-touch-icon.png dist/
printf '/* /index.html 200\n' > dist/_redirects
# Chunk names embed a content hash — let browsers cache them forever; the HTML
# entry points keep the default 4h and roll the references on deploy.
printf '/chunks/*\n  Cache-Control: public, max-age=31536000, immutable\n' > dist/_headers
npx esbuild web/main.tsx --bundle --format=esm --splitting --outdir=dist \
  --loader:.wasm=binary --jsx=automatic --jsx-import-source=react \
  --target=es2022 --minify --entry-names="[name]" --chunk-names="chunks/[name]-[hash]"
# Preload main.js's statically-imported shared chunks: without this the browser
# only discovers them after downloading+parsing main.js (an extra serial network
# hop on the critical path). The engine-*.js chunk is a dynamic import — never
# preload it; share links rendered via kroki must not pay for the wasm.
for c in $(grep -o 'chunks/chunk-[A-Za-z0-9]*\.js' dist/main.js | sort -u); do
  sed -i "s|</head>|<link rel=\"modulepreload\" href=\"/$c\" />\n  </head>|" dist/index.html dist/diagrams.html dist/login.html
done
# Cache-bust: Pages serves assets with max-age=14400, so version the URLs by
# CONTENT hash — browsers refetch right after a deploy that actually changed a
# file, and keep their cache across deploys that didn't.
V=$(cat dist/main.js dist/styles.css | md5sum | cut -c1-8)
sed -i "s|/styles.css|/styles.css?v=$V|g; s|/main.js|/main.js?v=$V|g" dist/index.html dist/diagrams.html dist/login.html

echo "✓ built dist/ ($(du -sh dist | cut -f1))"
