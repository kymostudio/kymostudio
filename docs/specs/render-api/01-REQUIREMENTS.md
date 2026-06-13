---
title: kymo-render-api (Kroki-compatible render Worker) — Requirements (ConOps, StRS & SRS)
document_id: FEAT-KRENDER-001
version: "1.0"
issue_date: 2026-06-13
status: Adopted
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining `packages/render-api`; reviewers; stakeholders
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - DESIGN-KRENDER-001
  - TEST-KRENDER-001
  - FEAT-KMCP-001
  - FEAT-KEDITOR-001
  - FEAT-FLOWCHART-001
authors:
  - Vũ Anh
language: en
keywords:
  - render-api
  - kroki
  - cloudflare-workers
  - svg
  - png
  - pdf
  - rate-limiting
  - versioning
  - wasm
  - requirements
  - srs
  - iso-29148
---

# kymo-render-api (Kroki-compatible render Worker) — Requirements (ConOps, StRS & SRS)

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

kymostudio diagrams need to render anywhere a URL can go: a README image, a
Notion embed, a share link opened on a cold browser. The editor renders the
`kymo` DSL and mermaid in-browser, but the other ~27 kroki diagram types were
proxied to the public `kroki.io` — a single European origin that renders some
kinds with heavyweight machinery (mermaid through a puppeteer-driven headless
Chrome), with its own queue and bad days. `kymo-render-api` is a dedicated
Cloudflare Worker at `render.kymo.studio` that exposes a Kroki-compatible HTTP
API, renders the kinds whose engines can run in `workerd` **at the edge PoP
nearest the caller**, proxies the rest to kroki.io, and caches everything by
content hash.

### A.2 Users & context of operations (ConOps)

- **The editor** (`editor.kymo.studio`) — first paint of a share link, and the
  "Copy Markdown image" URL it generates.
- **Third-party embeds** — GitHub camo, Notion, chat apps fetching a
  `GET /{kind}/{format}/{encoded}` image URL.
- **API consumers** — anyone POSTing diagram source, with or without a
  signed-in identity.

### A.3 Goals & non-goals

**Goals.** Kroki wire compatibility; self-render the portable kinds faster than
proxying; a content-addressed edge cache; PNG/PDF with correct text; API
versioning and per-tier rate limiting; deploy from CI.

**Non-goals.** Persisting diagrams (that is the mcp worker + D1); an account
system (identity is reused only to pick a rate-limit tier); rendering kinds
whose engines are JVM/Python/TeX processes (those stay proxied, permanently).

### A.4 Stakeholder needs (`SN-KR`)

- **SN-KR-01** A diagram source must render to an image through a stable,
  Kroki-compatible URL with no account required.
- **SN-KR-02** Share-link and embed loads must be fast worldwide, not just near
  the renderer.
- **SN-KR-03** Raster output (PNG/PDF) must contain the diagram's text.
- **SN-KR-04** The service must resist abuse without penalising real users, and
  signed-in users should get more headroom.
- **SN-KR-05** The API must be able to evolve without breaking existing clients.
- **SN-KR-06** Availability must not hinge on any single upstream.

### A.5 Scope

In scope: the HTTP API surface, the render dispatch (self vs proxy), output
formats, caching, rate limiting, versioning, and CI deployment of the Worker.
Out of scope: the diagram engines themselves (specified by their own features —
flowchart, kymojson, icons, bpmn) and the editor UI.

## Part B — Introduction

### B.1 Purpose

Specify, as built, the requirements `packages/render-api` satisfies. The
companion **DESIGN-KRENDER-001** explains *how*; **TEST-KRENDER-001** records
verification.

### B.2 Relationship to the engine and the editor

The Worker bundles the same engines the rest of the project uses: the
`kymostudio` JS library + `kymostudio-core` wasm (kymo/d2/dot/bpmn), a full
merman build for every mermaid grammar (`kymo-mermaid` feature `full`), real
graphviz (`@viz-js/viz`), `svgbob` (`kymo-svgbob` crate), `pikchr` (emscripten),
and the upstream JS engines kroki's companions run (nomnoml, bytefield, wavedrom,
vega/vega-lite, dbml). The editor consumes the API and warms its cache on Share.

### B.3 Status & ownership

Adopted; shipped across PRs #321–#337 and live at `render.kymo.studio`. Owner:
the diagrams/ project. Source: `packages/render-api`.

### B.4 Glossary

- **kind** — a diagram type (`kymo`, `mermaid`, `graphviz`, …).
- **self-rendered kind** — rendered inside the Worker; **proxied kind** —
  forwarded to kroki.io.
- **authoritative kind** — a self-rendered kind whose engine *is* the engine
  kroki runs, so its parse errors are final (no proxy fallback).
- **tier** — `anon` or `user`, selecting a rate-limit bucket.

## Part C — Requirements (SRS)

### C.1 Functional — API surface (`FR-KR`)

- **FR-KR-01** Accept `GET /{kind}/{format}/{encoded}`, where `encoded` is the
  diagram source deflate-compressed (zlib) and base64url-encoded — the Kroki URL
  encoding, byte-identical to the editor's `?s=` share payload.
- **FR-KR-02** Accept `POST /{kind}/{format}` with the source as the `text/plain`
  body; `POST /{kind}` with the format from the `Accept` header (default `svg`);
  and `POST /` with a JSON body `{diagram_source, diagram_type, output_format}`.
- **FR-KR-03** Support output formats `svg`, `png`, and `pdf`. PNG accepts an
  optional `?scale=` clamped to `[1, 4]`.
- **FR-KR-04** Reject with `400` an unknown kind, an unsupported format, an
  undecodable payload, or a syntactically invalid source for an authoritative
  kind; `413` for an over-cap payload; `502` when an upstream proxy is
  unreachable; `500` on an unexpected render failure.
- **FR-KR-05** Serve `GET /` (a JSON usage document), `GET /healthz` (`ok`), and
  `GET /version` (API + per-kind engine versions).
- **FR-KR-06** Enable permissive CORS on every response.

### C.2 Functional — Rendering & dispatch (`FR-KR`)

- **FR-KR-07** Self-render in the Worker: `kymo`, `mermaid` (all grammars), `d2`,
  `graphviz` (full DOT), `bpmn`, `nomnoml`, `bytefield`, `wavedrom`, `vega`,
  `vegalite`, `svgbob`, `pikchr`, `dbml` — 15 of the 29 kinds.
- **FR-KR-08** Proxy every remaining kroki kind (plantuml, c4plantuml, ditaa,
  the blockdiag family, tikz, erd, structurizr, symbolator, umlet, wireviz,
  excalidraw) to `https://kroki.io/{kind}/{format}`.
- **FR-KR-09** For a self-rendered kind whose grammar is a subset (e.g. the
  core's flowchart-only mermaid path, when not superseded), fall through to
  kroki.io if the local engine rejects a source; for authoritative kinds the
  error is final.
- **FR-KR-10** Rasterize text correctly: PNG/PDF must render `<text>` using a
  bundled font, since the wasm build carries no system fonts and resvg ignores
  `@font-face`.

### C.3 Functional — Caching (`FR-KR`)

- **FR-KR-11** Cache every successful render at the edge keyed on
  `SHA-256(kind ∥ format ∥ scale ∥ source)`, with `cache-control: public,
  max-age=31536000, immutable`. Diagrams are immutable-by-construction (new
  source → new key), so the cache is never stale.
- **FR-KR-12** Report `x-render-cache: hit|miss`. Never cache non-200 responses.
- **FR-KR-13** A POST render and the equivalent GET (share-URL) render must hit
  the same cache entry.

### C.4 Functional — Versioning (`FR-KR`)

- **FR-KR-14** Accept an optional `/v1` prefix on any render route; the
  un-prefixed root is v1 for Kroki compatibility. An unknown major (`/v2…`)
  returns `404`.
- **FR-KR-15** `GET /version` reports `api_version` and the version of the engine
  behind each kind (read from `package.json`; bundled wasm engines report
  `"bundled"`).
- **FR-KR-16** Every response carries an `x-render-api-version` header.

### C.5 Functional — Rate limiting & identity (`FR-KR`)

- **FR-KR-17** Rate-limit every render request (cache hit or miss). Metadata
  routes (`OPTIONS`, `/healthz`, `/version`, `GET /`) are exempt.
- **FR-KR-18** Two tiers: **anonymous** — 60 requests / 60 s keyed on
  `cf-connecting-ip`; **signed-in** — 120 requests / 60 s keyed on the Google
  `sub`.
- **FR-KR-19** Select the tier by verifying a Google `id_token` (Bearer header
  or `?id_token`) against Google's JWKS with audience = `GOOGLE_CLIENT_ID` — the
  same token the mcp worker verifies. A missing or invalid token **downgrades to
  anonymous; it never fails the render**.
- **FR-KR-20** On exceedance return `429` with `Retry-After: 60` and
  `x-ratelimit-tier`; echo `x-ratelimit-tier: anon|user` on rendered responses.

### C.6 Non-functional (ISO/IEC 25010) (`NFR-KR`)

- **NFR-KR-01 Performance.** Warm-isolate self-render medians ≤ ~90 ms from a
  co-located client; self-rendered SVG beats proxying 2–8× where kroki's engine
  is heavy, and wins by network distance from far clients.
- **NFR-KR-02 Compatibility.** A payload lifted from a kroki.io GET URL renders
  unchanged. `nodejs_compat` is enabled for JS engines that import node builtins.
- **NFR-KR-03 Portability.** All wasm is instantiated from deploy-time-compiled
  modules; the Worker never compiles wasm at runtime (forbidden in workerd).
- **NFR-KR-04 Reliability.** kroki.io remains a direct fallback in the editor;
  the cache shields repeat loads from upstream outages.
- **NFR-KR-05 Security.** The identity token is used only to pick a tier and is
  sent by the editor only to the render API, never to the kroki.io fallback.
- **NFR-KR-06 Resource.** Compressed bundle ~6 MB (Workers Paid: 10 MB / 30 s
  CPU). A raster-size pre-check rejects targets > 8192 px/side.

### C.7 Out of scope / deferred

- Exact (hard-quota) rate limiting — Cloudflare native rate limiting is
  approximate/eventually-consistent per-colo; a Durable-Object counter would be
  required for a precise quota.
- `dbml` via runtime-compiled graphviz, and lazy per-engine wasm init to shrink
  cold-isolate latency — both noted in DESIGN Annex A.
- Retiring the legacy `/api/render` proxy on the mcp worker.

### C.8 Acceptance criteria (feature-level)

A render exists at `render.kymo.studio` for every kind in FR-KR-07/08 across
`svg/png/pdf`; PNG/PDF contain text; the Kroki GET encoding round-trips; `/v1`,
`/version`, and `x-render-api-version` behave per C.4; the two rate-limit tiers
behave per C.5 with token failures degrading gracefully; CI deploys the Worker
on push to `main`.

## Annex A — Revision History

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-06-13 | Initial as-built spec (PRs #321–#337). | Vũ Anh |
