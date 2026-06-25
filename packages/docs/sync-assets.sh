#!/usr/bin/env bash
#
# Copy static ASSETS (not content) into docs/public/ before an RSPress build.
# Content is self-contained MDX under docs/; only the generated SVG samples and
# the brand marks live outside this package, so we sync them here.
set -euo pipefail
cd "$(dirname "$0")"

PUB="docs/public"
mkdir -p "$PUB/samples"

cp ../../docs/brand/logo.svg ../../docs/brand/favicon.svg "$PUB/"

# Pre-rendered diagram samples referenced by the quickstart pages (Phase 2) and
# a few guide pages. Same prefix list the old VitePress build used.
for prefix in flow seq class state er journey gantt pie quadrant req git c4 \
              mindmap timeline sankey xy block packet kanban arch radar treemap; do
  cp ../../samples/"$prefix"-*.svg "$PUB/samples/" 2>/dev/null || true
done
cp ../../samples/approval.svg "$PUB/samples/" 2>/dev/null || true

# Cloudflare Pages redirects: root + the pages relocated into /reference +
# locale path prefixes (footer language switcher uses /vi/, /zh/ like the
# other kymo sites; 302-strip so RSPress's client router sees the real path).
{
  printf '/ /guide/getting-started 302\n'
  printf '/guide/ /guide/getting-started 302\n'
  printf '/guide/dsl-guide /reference/dsl 301\n'
  printf '/guide/mcp /reference/mcp 301\n'
  printf '/diagrams/bpmn /reference/bpmn 301\n'
  printf '/diagrams/flowchart-notation /reference/flowchart-notation 301\n'
  printf '/vi /guide/getting-started 302\n'
  printf '/zh /guide/getting-started 302\n'
  printf '/vi/ /guide/getting-started 302\n'
  printf '/zh/ /guide/getting-started 302\n'
  printf '/vi/* /:splat 302\n'
  printf '/zh/* /:splat 302\n'
} > "$PUB/_redirects"

echo "✓ synced assets into $PUB ($(find "$PUB/samples" -type f | wc -l | tr -d ' ') samples)"
