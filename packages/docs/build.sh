#!/usr/bin/env bash
#
# Build the KymoStudio docs site into dist/ (deploy artifact for Cloudflare
# Pages project "kymo-docs").
#
# The markdown SOURCE OF TRUTH stays in the repo docs/ tree — this script
# copies the published subset into site/ (gitignored), then runs VitePress.
set -euo pipefail
cd "$(dirname "$0")"

echo "→ syncing content (docs/ → site/)"
rm -rf site/guide site/diagrams
mkdir -p site/guide site/diagrams site/public
cp ../../docs/guide/getting-started.md   site/guide/
cp ../../docs/guide/dsl-guide.md         site/guide/
cp ../../docs/guide/faq.md               site/guide/
cp ../../docs/diagrams/flowchart/README.md   site/diagrams/flowchart-notation.md
cp ../../docs/diagrams/bpmn/README.md        site/diagrams/bpmn.md
cp ../../docs/diagrams/best-practices.md     site/diagrams/best-practices.md
cp ../../docs/brand/logo.svg ../../docs/brand/favicon.svg site/public/

# Site-only markdown (authored for the docs site, not mirrored from docs/)
# lives in content/ and is overlaid onto the synced tree.
cp -R content/. site/
# Rendered sample images referenced by content/ pages (served from /samples/).
mkdir -p site/public/samples
cp ../../samples/approval.svg site/public/samples/
for prefix in flow seq class state er journey gantt pie quadrant req git c4 \
              mindmap timeline sankey xy block packet kanban arch radar treemap; do
  cp ../../samples/"$prefix"-*.svg site/public/samples/
done
# No landing page — the root redirects straight to Getting Started (Cloudflare
# Pages reads _redirects from the deploy root). /guide/ kept for old links.
printf '/ /guide/getting-started 302\n/guide/ /guide/getting-started 302\n' > site/public/_redirects

# Sample images live outside the published subset — point them at the repo raw URLs
# (VitePress resolves local image assets strictly, unlike dead links).
# perl -pi (not sed -i) so the script runs on both GNU (CI) and BSD/macOS.
RAW="https://raw.githubusercontent.com/kymostudio/kymostudio/main/samples"
# The cookbook is not published on the site — point its links at GitHub.
COOKBOOK="https://github.com/kymostudio/kymostudio/blob/main/docs/guide/cookbook.md"
find site/guide site/diagrams -name '*.md' -exec \
  perl -pi -e "s|\]\(\.\./\.\./samples/|](${RAW}/|g; s|\]\(\./\.\./\.\./samples/|](${RAW}/|g; s|\]\((?:\./)?cookbook\.md\)|](${COOKBOOK})|g" {} +

echo "→ vitepress build"
rm -rf dist
npx vitepress build site --outDir dist

echo "✓ built dist/ ($(find dist -type f | wc -l | tr -d ' ') files, $(du -sh dist | cut -f1))"
