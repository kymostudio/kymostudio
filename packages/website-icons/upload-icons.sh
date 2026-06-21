#!/usr/bin/env bash
#
# Publish the kymo icon art to Cloudflare R2 (bucket `kymo-icons`, served
# publicly at https://cdn.kymo.studio). The gallery (index.html) and both the
# Python/JS impls reference icons by their manifest-relative path
# `icons/<set>/…`; this script uploads each file under that exact key, so the
# public URL is `https://cdn.kymo.studio/icons/<set>/…`.
#
# Idempotent: re-running overwrites (PUT) — safe to run after adding/changing
# icons. Credless: uses your existing `wrangler` OAuth login (the same identity
# that deploys the Pages sites). Parallelised; ~10-15 min for the full ~2.5k
# files, a few seconds for an incremental change.
#
# Usage:
#   ./upload-icons.sh                # upload every file under ../icons/icons
#   ./upload-icons.sh icons/aws      # upload only a subtree (path under ../icons)
#
# One-time bucket setup (already done; here for the record):
#   wrangler r2 bucket create kymo-icons
#   wrangler r2 bucket domain add kymo-icons --domain cdn.kymo.studio \
#       --zone-id <kymo.studio zone id> --min-tls 1.2
set -euo pipefail
cd "$(dirname "$0")/../icons"   # packages/icons (manifest paths are relative to here)

BUCKET=kymo-icons
SUBTREE="${1:-icons}"
JOBS="${JOBS:-12}"
WRANGLER="${WRANGLER:-npx wrangler}"

command -v npx >/dev/null || { echo "npx/node required"; exit 1; }

put() {
  local f="$1" ct
  case "$f" in
    *.png) ct=image/png ;;
    *.svg) ct=image/svg+xml ;;
    *.json) ct=application/json ;;
    *) ct=application/octet-stream ;;
  esac
  # shellcheck disable=SC2086
  $WRANGLER r2 object put "$BUCKET/$f" --file="$f" --content-type="$ct" --remote \
    >/dev/null 2>&1 && echo "ok" || echo "FAIL $f"
}
export -f put
export WRANGLER BUCKET

total=$(find "$SUBTREE" -type f \( -name '*.png' -o -name '*.svg' \) | wc -l | tr -d ' ')
echo "→ uploading $total files from $SUBTREE to R2 bucket '$BUCKET' (JOBS=$JOBS)"

results=$(find "$SUBTREE" -type f \( -name '*.png' -o -name '*.svg' \) \
  | xargs -P "$JOBS" -I{} bash -c 'put "$@"' _ {})

ok=$(grep -c '^ok' <<<"$results" || true)
fail=$(grep -c '^FAIL' <<<"$results" || true)
echo "✓ done: ok=$ok fail=$fail / $total"
if [ "$fail" -gt 0 ]; then
  echo "failed files:"; grep '^FAIL' <<<"$results"
  exit 1
fi
echo "  public base: https://cdn.kymo.studio/"
