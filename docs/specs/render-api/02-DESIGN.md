---
title: kymo-render-api (Kroki-compatible render Worker) — Design
document_id: DESIGN-KRENDER-001
version: "1.0"
issue_date: 2026-06-13
status: Adopted
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining `packages/render-api`
review_cycle: On scope change
supersedes: null
related_documents:
  - FEAT-KRENDER-001
  - TEST-KRENDER-001
  - DESIGN-KMCP-001
authors:
  - Vũ Anh
language: en
keywords:
  - design
  - cloudflare-workers
  - workerd
  - wasm
  - wasm-bindgen
  - emscripten
  - rate-limiting
  - jose
  - cache-api
---

# kymo-render-api (Kroki-compatible render Worker) — Design

## 1. Placement & runtime — FR-KR-01..06, NFR-KR-03

A single Cloudflare Worker (`packages/render-api`, custom domain
`render.kymo.studio`). No Durable Objects, KV, or D1 — only the Cache API and
two rate-limit bindings. `compatibility_flags: ["nodejs_compat"]` (JS engines
import node builtins like `path`). The `.wasm` modules ride in through
wrangler's built-in CompiledWasm rule (deploy-time compiled); fonts ship as
`Data` modules (`**/*.ttf` rule); `@aduh95/viz.js/sync` is aliased to a stub so
dbml-renderer's dead legacy engine stays out of the bundle.

```
src/
  index.ts       fetch handler: version prefix → metadata routes → rate limit → cache → dispatch
  kroki.ts       decode the 4 request shapes → {kind, format, source, scale}
  codec.ts       deflate+base64url decode (copied from editor/web/share.ts)
  dispatch.ts    kind → self-render | proxy; AUTHORITATIVE set; format fan-out
  engine.ts      kymostudio-core + svgbob + merman wasm: lazy initSync + registerFont
  js-engines.ts  upstream JS engines (nomnoml, bytefield, wavedrom, vega*, dbml, graphviz)
  graphviz/      @viz-js/viz wasm extraction + instantiateWasm shim
  pikchr/        pikchr.c emscripten artifacts + instantiateWasm
  auth.ts        verify Google id_token → tier
  cache.ts       content-hash Cache API helpers
  version.ts     API_VERSION + engine versions from package.json
  http.ts        HttpError, CORS, Format, content types
```

## 2. Request decoding — FR-KR-01, 02, 14

`index.ts` first strips an optional `/v1` prefix (regex `^/v(\d+)`); a non-`1`
major returns 404, the un-prefixed root is treated as v1. The normalised
pathname feeds `decodeRequest`, which recognises the four Kroki shapes by method
and segment count and returns `{kind, format, source, scale}`. GET payloads are
inflated incrementally with a 2 MB zip-bomb cap; POST bodies are capped at
512 KB. `?scale=` is clamped to `[1, 4]`.

## 3. Render dispatch — FR-KR-07..10

`dispatch.ts` merges two registries — wasm engines (`engine.ts`) and JS engines
(`js-engines.ts`) — into one `SELF_RENDERERS` table, plus a `PROXY_KINDS` set.
An `AUTHORITATIVE` set marks kinds whose local engine *is* kroki's engine
(nomnoml, bytefield, wavedrom, vega/vegalite, svgbob, pikchr, graphviz, dbml):
their parse errors are final 400s. Subset-grammar kinds fall through to
`proxyKroki` on error. SVG is returned as-is; PNG/PDF go through
`svgToPng(svg, scale)` / `svgToPdf(svg)` after a raster-size pre-check. Proxied
kinds get PNG/PDF straight from kroki (no local re-raster).

Engine classes and their integration cost:

| Class | Kinds | Integration |
|---|---|---|
| JS upstream | nomnoml, bytefield, wavedrom, vega, vegalite, dbml | import the npm package kroki's companion runs; vega uses `vega-interpreter` (AST mode) because workerd forbids `new Function()` |
| Rust → wasm-bindgen | kymo, d2, graphviz-flowchart-subset, bpmn (kymostudio-core); svgbob (kymo-svgbob); mermaid all-grammar (kymo-mermaid `full` = merman) | `initSync({module})` in `ensure()` |
| C/emscripten | pikchr; graphviz (`@viz-js/viz`) | `instantiateWasm` hook (§5) |

## 4. wasm in workerd — NFR-KR-03

workerd cannot compile wasm at runtime, so every engine is fed a
deploy-time-compiled `WebAssembly.Module`:

- **wasm-bindgen (`--target web`)**: `engine.ts` imports each `*_bg.wasm` and
  calls the glue's `initSync({ module })` once in a lazy, idempotent `ensure()`.
  The async `init()` default path (which fetches a relative URL) is never called.
- **emscripten (pikchr)**: `MODULARIZE`+`EXPORT_ES6` output normally fetches and
  compiles its wasm; instead the factory's `instantiateWasm` hook receives
  `new WebAssembly.Instance(precompiledModule, imports)`. Artifacts are vendored
  with a `build.sh`; CI carries no emsdk.

## 5. Real graphviz & dbml — FR-KR-07, 08

`@viz-js/viz` embeds its wasm bytes and runtime-compiles them, exposing no
`instantiateWasm` hook. `graphviz/index.ts` therefore briefly swaps the **global**
`WebAssembly.instantiate` during `instance()` init: byte-array calls receive the
deploy-time-compiled module (`graphviz/extract.mjs` captures matching bytes from
the same package version at build/install time; the artifact is gitignored), and
the original is restored in a `finally`. `dbml-renderer` emits DOT, which this
real graphviz lays out; its own SVG path (legacy viz.js) is aliased away.

## 6. Font registration — FR-KR-10

The wasm build of `kymostudio-core` has an empty fontdb and resvg ignores
`@font-face`, so PNG/PDF would drop all `<text>`. The core gains
`register_font(bytes)` (wasm `registerFont`); `ensure()` registers Roboto
Regular/Bold (`fonts/*.ttf`, Apache-2.0) into both the resvg and svg2pdf fontdbs,
pointing the generic families at the registered face.

## 7. Caching — FR-KR-11..13

`cache.ts` synthesises a GET cache key
`{origin}/__cache/{kind}/{format}?h={sha256}` so POST and GET renders share one
entry. `caches.default` stores the response with an immutable 1-year TTL via
`ctx.waitUntil`; non-200s are never cached. The editor additionally **warms**
this cache when the Share menu opens (one fire-and-forget POST), so a recipient's
first paint and GitHub's first image fetch start as hits.

## 8. Versioning — FR-KR-14..16

`version.ts` holds `API_VERSION` ("1.0.0", mirrored in `package.json`) and builds
the `/version` payload from the installed `package.json` dependency versions
(local `file:` engines → `"bundled"`). `withCors` stamps `x-render-api-version`
on every response; the header is CORS-exposed.

## 9. Rate limiting & identity — FR-KR-17..20, NFR-KR-05

Two Cloudflare native rate-limit bindings: `ANON_LIMITER` (60/60 s, ns 1001) and
`USER_LIMITER` (120/60 s, ns 1002). `auth.ts#identify` reads a Bearer/`?id_token`
token and verifies it with `jose` against Google's JWKS (cached per isolate)
with audience `GOOGLE_CLIENT_ID`; success → tier `user`, key `user:{sub}`,
`USER_LIMITER`; otherwise tier `anon`, key `cf-connecting-ip`, `ANON_LIMITER`.
Verification runs only when a token is present and **only downgrades** on
failure. The check sits before cache lookup, so hits count too (a deliberate
choice). The editor (`kroki.ts` + the index.html early kick-off) attaches the
Bearer token only when targeting `RENDER_API`, never the kroki.io fallback.

> Native rate limiting is approximate and per-colo: enforcement is exact in
> local dev (single instance) but on production needs a strong concurrent burst
> to trip, because counters are distributed across isolates. It is an
> abuse-control, not a hard quota (see FEAT-KRENDER-001 C.7).

## 10. Deployment — NFR-KR-06

`.github/workflows/deploy-render-api.yml` builds the wasm crates from source
(`kymostudio-core --features wasm,pdf`; `kymo-mermaid --features wasm,full`;
`kymo-svgbob`), builds `packages/js`, runs `graphviz/extract.mjs`, typechecks,
and `wrangler deploy`s on push to `main` touching the worker, `packages/js`, or
the engine crates. The `CLOUDFLARE_API_TOKEN` secret needs Workers Scripts:Edit
+ Pages + Workers Routes across the `kymo.studio` zone.

## Annex A — Key decisions & ADR

- **ADR-1 Self-render where portable, proxy the rest.** Half of kroki's catalog
  is a JVM/Python/TeX process; the portable half (JS/wasm engines) runs at the
  PoP. Latency win where engines are heavy; ties where they are native; no
  compatibility loss because subset engines fall through and the rest proxy.
- **ADR-2 Global `WebAssembly.instantiate` swap for viz.js.** Forking the
  emscripten build to expose `instantiateWasm` was more work than a scoped,
  restored global shim. Confined to `instance()` init.
- **ADR-3 Identity for tiering only.** Reusing the editor's Google id_token
  avoids a second auth system; failures degrade to anonymous so a render never
  depends on auth being healthy.
- **ADR-4 Approximate rate limiting.** Cloudflare native rate limiting is cheap
  and binding-only; a precise quota would need a Durable-Object counter
  (latency + cost). Chosen as abuse-control.
- **ADR-5 Cache hits count toward the limit.** Simpler and abuse-resistant;
  the alternative (exempt hits) was considered and may be revisited if shared-IP
  embed bursts cause false 429s.

## Annex B — Revision History

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-06-13 | Initial as-built design (PRs #321–#337). | Vũ Anh |
