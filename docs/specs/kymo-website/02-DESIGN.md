---
title: Kymo Website (kymo.studio landing page) — Design
document_id: DESIGN-KWEB-001
version: "0.1"
issue_date: 2026-06-10
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the public landing page (`packages/website/src/`) and its deploy
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - FEAT-KWEB-001
  - TEST-KWEB-001
  - PLAN-KWEB-001
  - FEAT-CANVAS-001
  - FEAT-KEDITOR-001
authors:
  - Vũ Anh
language: en
keywords:
  - technical-design
  - kymo-website
  - kymo-studio
  - landing-page
  - static-site
  - vanilla-js
  - cloudflare-pages
  - esbuild
  - committed-bundle
  - seo
  - open-graph
---

# Kymo Website (kymo.studio landing page) — Design

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `DESIGN-KWEB-001` |
| Version           | 0.1 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KWEB-001` (requirements), `TEST-KWEB-001` (V&V), `PLAN-KWEB-001` (plan/why), `FEAT-CANVAS-001` (the `/app/` playground, referenced), `FEAT-KEDITOR-001` (the sibling editor subdomain) |

> **The *how* that complements `FEAT-KWEB-001`.** The landing page adds **no framework and no build step** — it is hand-authored static HTML/CSS plus one inline script for the sample modal. This design owns the landing (`packages/website/src/`) and the packaging/deploy that ships it; it treats the `/app/` playground as an opaque, **committed** artifact it copies into place. File references are to the shipped tree: `packages/website/src/index.html`, `packages/website/src/styles.css`, `packages/website/src/CNAME`, `packages/website/build.sh`, `packages/website/app/build.sh`, `.github/workflows/deploy-website.yml`.

---

## 1. Scope & composition

```
                build.sh assembles ─────────────▶  dist/  (one Cloudflare Pages artifact)
 packages/website/                                  ├── index.html  styles.css  CNAME  .nojekyll   ← landing (THIS spec)
 ├── src/   (landing — owned here)                  └── app/
 │    index.html · styles.css · CNAME · .nojekyll        ├── index.html
 └── app/   (playground — FEAT-CANVAS-001)               └── kymo.bundle.js   (committed artifact, copied as-is)
      index.html · kymo.bundle.js (committed)
```

The landing is the kymo.studio root; the playground is mounted under `/app/`. This design documents only the landing and the assembly/deploy; the playground's internals live in `FEAT-CANVAS-001` / `FEAT-STUDIO-001`.

## 2. Page structure (`src/index.html`) — FR-KW-01..05

Single hand-authored document, sections top to bottom:

- **`<nav>`** — brand (green dot + "kymo") and links: `app/` (Playground), `#samples`, GitHub (`index.html:18-27`). → FR-KW-01.
- **`<header class="hero">`** — headline, lead `<p>`, a `.install` line with the `uv tool install …` command, and three CTA buttons (`index.html:29-42`). → FR-KW-02.
- **`.preview`** — a framed `<img>` of the animated AIQ WebP from the GitHub raw CDN (`index.html:44-50`). → FR-KW-03.
- **`<section class="samples" id="samples">`** — a `.grid` of `<article class="card">` elements, each carrying `data-title` / `data-source` / `data-preview` / `data-github` and a thumbnail `<img>` + title + description + `.card-meta` (filename · dimensions) (`index.html:52-125`). Three cards today (AIQ, AWS Lex+Bedrock, NIM). → FR-KW-04.
- **`<footer>`** — GitHub link · Apache-2.0 (`index.html:127-129`). → FR-KW-05.
- **`.modal`** scaffold — overlay + content with title, View-on-GitHub link, close button, and a two-pane body (`<code id="modal-source">` + `<img id="modal-preview">`) (`index.html:132-147`).

## 3. Samples modal (inline `<script>`) — FR-KW-06..08

One IIFE at `index.html:149-215`:

- **`highlightDsl(text)`** — line-oriented DSL syntax highlighter: comment lines (`^\s*#`), then per-line `escapeHtml` + regex passes for strings, edge operators (`--&gt;`/`==&gt;`), line-start directives (`canvas:`/`title:`/`subtitle:`), and inline container keywords (`outer|inner|horizontal|vertical|row|external|above|pos|gap|align|padding|dash|stroke|icon|…`). The keyword set is tuned to the **v2.0+ DSL** (no `component`/`region`/`layout` keywords) (`index.html:157-179`). → FR-KW-06.
- **`openModal(card)`** — fills title/preview/GitHub from the card's `data-*`, opens the modal (body `modal-open`, `aria-hidden=false`), then `fetch(card.dataset.source, {cache:"no-store"})` and renders the highlighted source; on a non-OK/throw it sets fallback text (`index.html:181-197`). → FR-KW-06, FR-KW-08.
- **`closeModal()`** + listeners — card clicks open; every `[data-close]` (overlay + ✕) closes; an `Escape` keydown closes when open (`index.html:199-214`). → FR-KW-07.

No dependencies, no network beyond the per-sample GitHub-raw fetch. Highlighting is purely client-side regex (cosmetic — not a parser).

## 4. Styling & tokens (`src/styles.css`) — NFR-KW-04, NFR-KW-05

External stylesheet linked from the head. Dark theme by default with CSS custom-property design tokens (background `#0a0a0f`, accent kymo-green `#76b900`, plus spacing/shadow/radius), Inter from Google Fonts. Responsive: the hero scales with `clamp()`; the modal two-pane body stacks under a `max-width` breakpoint. Retheme / restyle is a token edit; the markup is unchanged. → NFR-KW-04, NFR-KW-05.

## 5. SEO/share & favicon (`<head>`) — FR-KW-09, FR-KW-10

`index.html:6-13`: `<title>` + `description`, Open-Graph (`og:title`/`og:description`/`og:image` = the AIQ WebP / `og:url` = `https://kymo.studio/`), Twitter `summary_large_image`, and an inline SVG-data-URI favicon (green rounded square). → FR-KW-09, FR-KW-10.

## 6. Build & packaging (`build.sh`) — FR-KW-11, NFR-KW-02/03

`packages/website/build.sh`:

1. Optional `--bundle` → `( cd app && ./build.sh )` rebuilds the playground bundle.
2. Guard: fail if `app/kymo.bundle.js` is missing (hint to run `--bundle`).
3. `rm -rf dist && mkdir -p dist/app`.
4. **Landing:** `cp src/{index.html,styles.css,CNAME,.nojekyll} dist/`.
5. **Playground:** `cp app/{index.html,kymo.bundle.js} dist/app/`.

The **committed-bundle** convention: `app/kymo.bundle.js` is an esbuild output checked into git (`app/build.sh` compiles `packages/js` + `packages/js-canvas`, `npm ci`, then `esbuild src/main.tsx … --minify`), so a normal website build/deploy **copies only — it never recompiles JS** (NFR-KW-03). → FR-KW-11.

## 7. Deploy (`.github/workflows/deploy-website.yml`) — FR-KW-12, FR-KW-13

On push to `main` touching `packages/website/**` (or the workflow file), plus `workflow_dispatch`:

1. `actions/checkout`.
2. `./build.sh` in `packages/website` → assembles `dist/`.
3. `cloudflare/wrangler-action` → `pages deploy packages/website/dist --project-name=kymo-studio --branch=main`, authed by `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`.

`concurrency: website-deploy` with `cancel-in-progress: false`. The `src/CNAME` (`kymo.studio`) + `.nojekyll` give the custom domain and as-is publishing. → FR-KW-12, FR-KW-13.

---

## Annex A — Key decisions & ADR

- **ADR-1 — Hand-authored static landing, no framework.** The landing is one HTML file + one CSS file + one inline script. No SSG/framework boot to maintain or ship; first paint is immediate (NFR-KW-01/03). Cost: no componentization — but the page is small and the samples are `data-*` cards.
- **ADR-2 — Committed playground bundle.** `app/kymo.bundle.js` is checked in so CI deploys static files with no JS toolchain (matching the repo's icon-index/bundle convention). Cost: the bundle can drift from `app/src/` if a rebuild is forgotten — tracked as a risk in `PLAN-KWEB-001` §5.
- **ADR-3 — GitHub-raw CDN for sample source & previews.** Sample `.kymo` source, SVG, and the AIQ WebP are referenced by `raw.githubusercontent.com` / `cdn.jsdelivr.net` URLs rather than copied into `dist/`. Keeps the deploy tiny and the samples single-sourced from `samples/`; cost: a repo move / path rename breaks the links (risk R1).
- **ADR-4 — Landing scope boundary.** The landing only *links* to `/app/`; the playground is a separate spec (`FEAT-CANVAS-001`). This spec deliberately does not document the React app, so the two evolve independently behind a stable `/app/` URL.
- **ADR-5 — Cloudflare Pages.** The site deploys to the Cloudflare Pages project `kymo-studio` (the deploy moved off GitHub Pages — see `PLAN-KWEB-001` §4). One artifact (`dist/`) serves both the landing and `/app/`.

## Annex B — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-10 | Vũ Anh | Initial design. Documents the landing page structure, the inline sample-modal script, styling/tokens, SEO/share meta, the `build.sh` committed-bundle packaging, and the Cloudflare Pages deploy — grounded in the shipped tree. ADRs record the static-no-framework, committed-bundle, GitHub-raw-CDN, scope-boundary, and Pages choices. |
