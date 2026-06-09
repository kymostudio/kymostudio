#!/usr/bin/env bash
#
# Build the playground bundle (React + TypeScript → kymo.bundle.js).
#
# esbuild bundles the React app (src/), the dependency-free `kymostudio`
# package, the icon manifest, and the starter samples into a single
# `kymo.bundle.js`. That artifact is committed so GitHub Pages can serve it as a
# static file (the Pages workflow uploads `website/` as-is and runs no build
# step). React + esbuild come from this dir's devDependencies; `node_modules` is
# git-ignored and never deployed.
#
# Usage:  ./build.sh
set -euo pipefail
cd "$(dirname "$0")"

echo "→ compiling kymostudio JS package to dist/"
npm --prefix ../../js run build

echo "→ compiling canvas engine to dist/"
[ -d ../../js-canvas/node_modules ] || npm --prefix ../../js-canvas ci
npm --prefix ../../js-canvas run build

echo "→ installing playground deps"
npm ci

echo "→ bundling playground → kymo.bundle.js"
npx esbuild src/main.tsx \
  --bundle --format=esm --target=es2022 \
  --jsx=automatic \
  --define:process.env.NODE_ENV='"production"' \
  --loader:.kymo=text --loader:.bpmn=text \
  --outfile=kymo.bundle.js \
  --minify

echo "✓ built $(du -h kymo.bundle.js | cut -f1) kymo.bundle.js"
