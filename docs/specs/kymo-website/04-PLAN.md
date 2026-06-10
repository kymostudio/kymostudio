---
title: Kymo Website (kymo.studio landing page) — Implementation Plan
document_id: PLAN-KWEB-001
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
  - DESIGN-KWEB-001
  - TEST-KWEB-001
  - FEAT-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - plan
  - project-plan
  - risk-register
  - kymo-website
  - kymo-studio
  - landing-page
  - cloudflare-pages
  - worklog
---

# Kymo Website (kymo.studio landing page) — Implementation Plan

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `PLAN-KWEB-001` |
| Version           | 0.1 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KWEB-001` (requirements), `DESIGN-KWEB-001` (design), `TEST-KWEB-001` (V&V), `FEAT-CANVAS-001` (the `/app/` playground, co-shipped under the same artifact) |

> **Implementation plan (ISO/IEC/IEEE 12207 §6.3), authored retrospectively.** The kymo.studio **landing page** is shipped; this plan traces the delivered work against git history and records the residual risks. It implements the spec in `docs/specs/kymo-website/`. **Static, no backend, no landing build step** — Cloudflare Pages serves `dist/` as-is.

---

## 1. Context

kymo needed a public front door. The entry gate was already met: a samples corpus exists in `samples/` (rendered SVG/WebP committed) and a playground (`packages/website/app/`) exists to link to. So the landing could be a thin, hand-authored static page that *shows* a real diagram and routes visitors onward — no framework, no server, no build step.

## 2. Decision

Hand-author the landing as static HTML/CSS (one inline script for the sample modal). Assemble it together with the **committed** playground bundle into one `dist/` via `build.sh`, and deploy to the Cloudflare Pages project `kymo-studio` at the custom domain kymo.studio. Reference sample source/previews from the GitHub-raw CDN rather than copying them. Keep the playground a separate spec behind a stable `/app/` URL.

## 3. Architecture (overview)

One deploy artifact, two surfaces (see `DESIGN-KWEB-001` §1):

- **Landing** — `packages/website/src/` (`index.html`, `styles.css`, `CNAME`, `.nojekyll`) → `dist/`.
- **Playground** — `packages/website/app/{index.html,kymo.bundle.js}` (committed) → `dist/app/`.

`deploy-website.yml` builds `dist/` and `wrangler pages deploy`s it to `kymo-studio`.

## 4. Phased plan (retrospective — ✓ Shipped)

| Phase | Commit / PR | Scope | SP | Status |
|-------|-------------|-------|----|--------|
| P0 | `3c98740` (#185) | Playground precursor (web-app flowchart playground) — the `/app/` lineage this landing links to. | — | ✓ Shipped (sibling, see `FEAT-CANVAS-001`) |
| P1 | `0b408f6` (#192) | **`packages/website` + landing page + deploy to kymo.studio** — hand-authored static landing (hero, samples grid, modal), `build.sh` assembling landing + committed playground bundle, CNAME. Realises FR-KW-01..13, NFR-KW-01..05. | 8 | ✓ Shipped |
| P2 | (deploy-website.yml) | **Move to Cloudflare Pages** — deploy `dist/` to project `kymo-studio` via `wrangler-action`, path-filtered on `packages/website/**`. | 5 | ✓ Shipped |
| P3 | `bd16d38` (#195) | Housekeeping — gitignore the `.wrangler/` local cache. | 1 | ✓ Shipped |

The **shipped landing is P1 + P2**; P0 is the sibling playground lineage, P3 is housekeeping.

## 5. Risk register

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|-----------|--------|------------|
| R1 | **GitHub-raw CDN dependency** — sample source/SVG and the hero WebP load from `raw.githubusercontent.com` / jsDelivr `@main`; a repo move, path rename, or branch change breaks them. | Med | Med | Single-sourcing from `samples/` is the point; pin a tag instead of `@main` if churn appears; the modal already degrades to fallback text (FR-KW-08). |
| R2 | **Committed-bundle staleness** — `app/kymo.bundle.js` can lag `app/src/` if a `--bundle` rebuild is forgotten. | Med | Low | Owned by the playground spec/CI; the website build only copies. Document the `./build.sh --bundle` step (it is in `DESIGN-KWEB-001` §6). |
| R3 | **Sample-card hard-coding** — titles/dimensions are hand-written in the cards; they can drift from the actual rendered output. | Low | Low | Cards are localized `data-*` edits; refresh on sample changes. |
| R4 | **Domain / Pages coupling** — the custom domain (`CNAME` → kymo.studio) and the Pages project name `kymo-studio` are coupled to the deploy; a project rename breaks publishing. | Low | Med | Keep the project name and `CNAME` in lockstep; documented in `DESIGN-KWEB-001` §7. |

## 6. Worklog / timeline

| Date (commit / PR) | Work |
|---------------------|------|
| `3c98740` (#185) | Playground precursor (web-app flowchart playground). |
| `0b408f6` (#192) | `packages/website` + landing page + deploy to kymo.studio (P1). |
| `deploy-website.yml` | Cloudflare Pages deploy to project `kymo-studio` (P2). |
| `bd16d38` (#195) | gitignore `.wrangler/` local cache (P3). |
| 2026-06-10 | Authored this spec set (`FEAT/DESIGN/TEST/PLAN-KWEB-001`) for the shipped landing page. |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-10 | Vũ Anh | Initial, retrospective plan. Traces P0→P3 against PRs #185/#192/#195 and the Cloudflare-Pages deploy, marks the shipped landing as P1+P2, and records risks R1–R4 (GitHub-raw CDN, committed-bundle staleness, sample hard-coding, domain/Pages coupling). |
