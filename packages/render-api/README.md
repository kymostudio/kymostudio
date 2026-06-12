# kymo-render-api

Kroki-compatible diagram render API on a Cloudflare Worker — `render.kymo.studio`.

```
GET  /{kind}/{format}/{encoded}   # kroki URL encoding (deflate + base64url)
POST /{kind}/{format}             # diagram source as text/plain body
POST /{kind}                      # output format via Accept header (default svg)
POST /                            # JSON {diagram_source, diagram_type, output_format}
```

Formats: `svg`, `png`, `pdf`. PNG takes `?scale=1..4`.

`kymo`, `mermaid` (flowchart), `d2`, `graphviz` and `bpmn` render **in the
worker** via the kymostudio JS engine + `kymostudio-core` wasm — when the local
grammar subset rejects a source (e.g. a mermaid `sequenceDiagram`) the request
falls through to kroki.io, so coverage matches kroki exactly. All other kroki
kinds (plantuml, ditaa, tikz, …) proxy to kroki.io. Every 200 is cached at the
edge by content hash (`x-render-cache: hit|miss`, immutable 1-year TTL).

The wasm build has no system fonts and resvg ignores `@font-face`, so the
worker registers `fonts/Roboto-*.ttf` (Apache-2.0) into the rasterizer at init
(`registerFont`) — without that, PNG/PDF output would drop every `<text>`.

## Develop

```bash
# from the repo root: build the full wasm + the JS engine first
(cd packages/rust/kymostudio-core && wasm-pack build --target web --out-dir pkg \
  --out-name kymostudio_core -- --no-default-features --features wasm,pdf)
(cd packages/js && npm ci && npm install --no-save ../rust/kymostudio-core/pkg && npm run build)

cd packages/render-api
npm install
npm install --no-save --no-package-lock ../rust/kymostudio-core/pkg ../js
npm run dev          # wrangler dev → http://127.0.0.1:8787

echo 'digraph { hello -> world }' | curl -s -X POST --data-binary @- \
  http://127.0.0.1:8787/graphviz/png -o out.png
```

Deploys from CI on push to `main` (`.github/workflows/deploy-render-api.yml`).
