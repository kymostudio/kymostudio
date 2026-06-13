---
title: kymo-render-api (Kroki-compatible render Worker) — Verification & Validation
document_id: TEST-KRENDER-001
version: "1.0"
issue_date: 2026-06-13
status: Adopted
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining `packages/render-api`; reviewers
review_cycle: On scope change
supersedes: null
related_documents:
  - FEAT-KRENDER-001
  - DESIGN-KRENDER-001
authors:
  - Vũ Anh
language: en
keywords:
  - verification
  - validation
  - test
  - bench
  - rate-limiting
  - iso-29148
---

# kymo-render-api (Kroki-compatible render Worker) — Verification & Validation

## 1. Strategy

Three layers: (a) `wrangler dev` smoke tests over the HTTP surface using `curl`;
(b) the online latency bench `benches/render-api/` (POST the same sources to
`render.kymo.studio` and `kroki.io`, busted and cache-hit passes); (c)
production verification after each CI deploy. The bench is a dated snapshot, not
a gate — both endpoints are live software whose numbers move with the network
and vantage point.

## 2. Feature test cases (`TC-KR`)

| ID | Traces | Procedure | Expected |
|---|---|---|---|
| TC-KR-01 | FR-KR-01, NFR-KR-02 | `GET /graphviz/svg/{kroki-encoded}` | 200, SVG; a kroki.io payload renders unchanged |
| TC-KR-02 | FR-KR-02 | POST text/plain, `POST /` JSON, `POST /{kind}` + Accept | 200 for each shape |
| TC-KR-03 | FR-KR-03 | `…/png?scale=2`, `…/pdf` | PNG at 2× dims; PDF `%PDF-…` |
| TC-KR-04 | FR-KR-07 | POST each self-rendered kind → svg | 200, `x-render-cache: miss`, valid SVG |
| TC-KR-05 | FR-KR-08 | POST a proxied kind (plantuml) twice | 200; `x-render-cache` miss → hit |
| TC-KR-06 | FR-KR-09 | POST a mermaid `sequenceDiagram` (full build) | 200 (rendered locally by merman) |
| TC-KR-07 | FR-KR-10 | `graphviz/png`, `mermaid/png` | PNG pixel variety high — text present (regression probe) |
| TC-KR-08 | FR-KR-04 | bad kind / bad format / garbage base64 / unclosed source | 400; >512 KB body → 413 |
| TC-KR-09 | FR-KR-11..13 | repeat identical render | second is `x-render-cache: hit`; POST & GET share the entry |
| TC-KR-10 | FR-KR-14 | `/v1/{kind}/{format}/{enc}`; `/v2/…` | v1 → 200; v2 → 404 |
| TC-KR-11 | FR-KR-15, 16 | `GET /version`; any render | version JSON with engine versions; `x-render-api-version` header |
| TC-KR-12 | FR-KR-17, 18 | 65 renders from one IP (local dev) | some `429` once the window fills |
| TC-KR-13 | FR-KR-19 | render with no token; with `Bearer not.a.realtoken` | both `x-ratelimit-tier: anon`, 200 (invalid token never fails the render) |
| TC-KR-14 | FR-KR-19, 20 | render with a valid Google id_token | `x-ratelimit-tier: user`; tier keyed on `sub` |
| TC-KR-15 | FR-KR-20 | exceed a tier | `429`, `Retry-After: 60`, `x-ratelimit-tier` |

## 3. Regression gates (must stay green)

- `npx tsc --noEmit` in `packages/render-api`.
- `wrangler deploy --dry-run` lists `ANON_LIMITER`, `USER_LIMITER`, and
  `GOOGLE_CLIENT_ID` bindings.
- The PNG text-presence probe (TC-KR-07) — a text-less PNG is byte-noticeably
  smaller and was the failure mode `registerFont` fixed.
- The rust workspace CI (fmt/clippy/test, all platforms incl. Windows) for the
  engine crates the Worker builds.

## 4. Non-functional verification

- **Performance (NFR-KR-01).** `benches/render-api/results/REPORT.md`, warm
  isolates: every self-rendered kind ≤ ~90 ms; mermaid 38–45 ms vs kroki
  243–315 ms; dbml 43 vs 255 ms; graphviz/svgbob/pikchr tie kroki's native
  engines. First-run-after-deploy shows the cold-isolate tax (~200–650 ms).
- **Rate limiting (NFR / FR-KR-18).** Exact in local dev (65 → ~8×429);
  approximate on production (a 250-way concurrent burst trips a few 429s).
- **Resource (NFR-KR-06).** Compressed bundle ~6 MB; Workers Paid.

## 5. Traceability matrix

| Requirement | Verified by |
|---|---|
| FR-KR-01..03 | TC-KR-01, 02, 03 |
| FR-KR-04 | TC-KR-08 |
| FR-KR-05 | TC-KR-10, 11 |
| FR-KR-07..09 | TC-KR-04, 05, 06 |
| FR-KR-10 | TC-KR-07 |
| FR-KR-11..13 | TC-KR-09 |
| FR-KR-14..16 | TC-KR-10, 11 |
| FR-KR-17..20 | TC-KR-12, 13, 14, 15 |
| NFR-KR-01 | §4 Performance (bench) |
| NFR-KR-03 | TC-KR-04/06 (wasm instantiates in workerd) |

## Annex A — Revision History

| Version | Date | Change | Author |
|---|---|---|---|
| 1.0 | 2026-06-13 | Initial V&V record (PRs #321–#337). | Vũ Anh |
