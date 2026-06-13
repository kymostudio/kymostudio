#!/usr/bin/env bash
# Regenerate pikchr.mjs + pikchr.wasm from the vendored pikchr.c (0-BSD, from
# pikchr.org via the npm `pikchr` package). The artifacts are committed —
# pikchr.c changes ~never, so CI doesn't carry an emsdk install for it.
# Needs emscripten (tested with emsdk 4.0.15).
set -euo pipefail
cd "$(dirname "$0")"
emcc pikchr.c -Os \
  -s MODULARIZE=1 -s EXPORT_ES6=1 -s ENVIRONMENT=web \
  -s EXPORTED_FUNCTIONS='["_pikchr","_malloc","_free"]' \
  -s EXPORTED_RUNTIME_METHODS='["ccall","UTF8ToString","getValue","stringToUTF8","lengthBytesUTF8"]' \
  -s ALLOW_MEMORY_GROWTH=1 \
  -o pikchr.mjs
