#!/usr/bin/env bash
#
# Build the kymostudio website into dist/ (the deploy artifact for kymo.studio).
#
#   dist/index.html  styles.css  CNAME  .nojekyll      ← landing (src/)
#   dist/app/index.html  kymo.bundle.js                ← playground (app/)
#
# The landing is hand-authored static HTML/CSS (no build step). The playground
# bundle app/kymo.bundle.js is a COMMITTED artifact (esbuild output) — the same
# convention the repo already uses, so a normal deploy never recompiles JS.
# Pass --bundle to rebuild it via app/build.sh (needs a healthy packages/js
# build; esbuild + React come from app/ devDependencies).
set -euo pipefail
cd "$(dirname "$0")"

if [[ "${1:-}" == "--bundle" ]]; then
  echo "→ rebuilding playground bundle (app/build.sh)"
  ( cd app && ./build.sh )
fi

[[ -f app/kymo.bundle.js ]] || { echo "✗ app/kymo.bundle.js missing — run: ./build.sh --bundle" >&2; exit 1; }

echo "→ cleaning dist/"
rm -rf dist
mkdir -p dist/app

echo "→ landing  (src/ → dist/)"
cp src/index.html src/styles.css src/CNAME src/.nojekyll dist/

echo "→ playground  (app/ → dist/app/)"
cp app/index.html app/kymo.bundle.js dist/app/

echo "✓ built dist/ ($(find dist -type f | wc -l | tr -d " ") files, $(du -sh dist | cut -f1))"
