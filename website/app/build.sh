#!/usr/bin/env bash
#
# Build the playground bundle.
#
# esbuild inlines the dependency-free `kymostudio` package, the icon manifest,
# and the starter samples into a single `kymo.bundle.js`. That artifact is
# committed so GitHub Pages can serve it as a static file (the Pages workflow
# uploads `website/` as-is and runs no build step). `npx` keeps esbuild out of
# `website/` — no node_modules is left behind to bloat the deploy.
#
# Usage:  ./build.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "→ compiling kymostudio JS package to dist/"
npm --prefix ../../packages/js run build

echo "→ bundling playground → kymo.bundle.js"
npx --yes esbuild@0.24 app.js \
  --bundle --format=esm --target=es2022 \
  --outfile=kymo.bundle.js \
  --loader:.kymo=text --loader:.bpmn=text \
  --minify

echo "✓ built $(du -h kymo.bundle.js | cut -f1) kymo.bundle.js"
