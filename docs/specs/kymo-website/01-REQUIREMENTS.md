---
title: Kymo Website (kymo.studio landing page) — Requirements (ConOps, StRS & SRS)
document_id: FEAT-KWEB-001
version: "0.1"
issue_date: 2026-06-10
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the public landing page (`packages/website/src/`) and its deploy; reviewers; stakeholders
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - DESIGN-KWEB-001
  - TEST-KWEB-001
  - PLAN-KWEB-001
  - FEAT-CANVAS-001
  - FEAT-STUDIO-001
  - FEAT-KEDITOR-001
  - FEAT-FLOWCHART-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-description
  - conops
  - stakeholder-requirements
  - requirements
  - srs
  - iso-29148
  - kymo-website
  - kymo-studio
  - landing-page
  - static-site
  - cloudflare-pages
  - samples
  - seo
  - acceptance-criteria
---

# Kymo Website (kymo.studio landing page) — Requirements (ConOps, StRS & SRS)

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `FEAT-KWEB-001` |
| Version           | 0.1 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `DESIGN-KWEB-001` (how), `TEST-KWEB-001` (V&V), `PLAN-KWEB-001` (plan), `FEAT-CANVAS-001` / `FEAT-STUDIO-001` (the `/app/` playground it links to), `FEAT-KEDITOR-001` (the sibling editor subdomain), `FEAT-FLOWCHART-001` (sample DSL) |

> This document consolidates the product description (ConOps & StRS), specification overview, and feature requirements (SRS) for **kymo-website** — the public **landing page** at **https://kymo.studio/** (`packages/website/src/`) and how it is packaged and shipped. It owns the `SN-KW-NN` stakeholder needs and the `FR-KW`/`NFR-KW` requirement IDs. **Scope is landing-only:** the React playground at `/app/` is owned by `FEAT-CANVAS-001` / `FEAT-STUDIO-001` and the separate `editor.kymo.studio` by `FEAT-KEDITOR-001` — this spec **references** them, it does not document them.

---

## Part A — Product Context (ConOps & StRS)

### A.1 Problem & motivation

kymo needs a public front door: a single page that, in seconds, shows a newcomer *what kymo produces* (a real animated diagram), tells them *how to install it*, and routes them to the *playground*, the *samples*, and *GitHub*. It must be cheap to host, instant to load, and produce good link-preview cards when shared — without standing up a CMS, a framework build, or a backend.

The landing page solves exactly that and nothing more: it is hand-authored static HTML/CSS with a single inline script for the sample modal. Everything heavy (the interactive editor) lives behind the "Open playground →" link, which is a **separate** product.

### A.2 Users & context of operations (ConOps)

- **Prospective users** arrive from a link, a share card, or search. They scan the hero, see the animated NVIDIA-AIQ preview, and either copy the install command or click into the playground.
- **Existing users** use the page as a jump-off: grab the `uv tool install …` line, open the playground, or browse the samples grid to read real `.kymo` source side-by-side with its rendered SVG.
- **Operators** push to `main`; CI assembles `dist/` and deploys it to Cloudflare Pages. There is no server, database, or analytics backend to run.

### A.3 Goals & non-goals

**Goals.**
- A static, instant-loading landing page that *shows* kymo's output (animated SVG/WebP).
- One-click routes to playground / GitHub / samples, and a copyable install command.
- A samples gallery where a card opens the real `.kymo` source (syntax-highlighted) beside its rendered diagram.
- Good discoverability: title/description + Open-Graph + Twitter share cards; a favicon.
- Zero runtime dependencies; deploy is fully automated.

**Non-goals (this spec).**
- The `/app/` playground itself (owned by `FEAT-CANVAS-001` / `FEAT-STUDIO-001`).
- The `editor.kymo.studio` editor (owned by `FEAT-KEDITOR-001`).
- A CMS, blog, docs site, or any server/analytics/auth backend.
- A build step or framework for the landing page (it is hand-authored static).

### A.4 Stakeholder needs (`SN-KW`)

| ID | Need |
|----|------|
| **SN-KW-01** | A visitor wants the page to load **instantly** with no spinner, framework boot, or server call. |
| **SN-KW-02** | A visitor wants to immediately **see what kymo produces** — a real, animated diagram, not a logo. |
| **SN-KW-03** | A visitor wants to **copy the install command** and to reach the playground / GitHub in one click. |
| **SN-KW-04** | A visitor wants to **browse samples** and read the actual `.kymo` source next to its rendered output. |
| **SN-KW-05** | Someone sharing the link wants a **good preview card** (title, description, image) on social / chat. |
| **SN-KW-06** | An operator wants the page to **deploy automatically** with nothing to run or pay for beyond static hosting. |

### A.5 Scope

In scope: the landing page (`packages/website/src/`: `index.html`, `styles.css`, `CNAME`,
`.nojekyll`), its sample modal script, and the site packaging + deploy that ship it
(`packages/website/build.sh`, `.github/workflows/deploy-website.yml`, Cloudflare Pages project
`kymo-studio`). Out of scope: the `/app/` playground bundle and source
(`packages/website/app/` — a sibling spec), and `editor.kymo.studio`.

---

## Part B — Introduction

### B.1 Purpose & motivation

This part frames the spec: what the landing page is, how the four KWEB documents fit together, and how the page relates to the sibling playground, editor, and the samples corpus it links to.

### B.2 Document map

- `FEAT-KWEB-001` (this doc) — the *what*: ConOps, stakeholder needs, SRS.
- `DESIGN-KWEB-001` — the *how*: page structure, the modal script, styling, SEO, build & deploy.
- `TEST-KWEB-001` — the *V&V*: test cases and traceability.
- `PLAN-KWEB-001` — the *delivery*: the (retrospective) phased history and risk register.

### B.3 Relationship to the playground, editor, and samples

kymo.studio is **three deployables, one domain root**:

| Surface | URL | Owner |
|---------|-----|-------|
| Landing page | `kymo.studio/` | **this spec (`FEAT-KWEB-001`)** |
| Playground (React canvas editor) | `kymo.studio/app/` | `FEAT-CANVAS-001` / `FEAT-STUDIO-001` |
| Flowchart editor + MCP live sync | `editor.kymo.studio` | `FEAT-KEDITOR-001` |

The landing and the playground share one deploy artifact (`dist/` — see `DESIGN-KWEB-001` §6); the editor is a separate subdomain and deploy. The samples grid links to `.kymo` source and rendered SVG/WebP in the repo's `samples/` corpus, served from the GitHub raw CDN.

### B.4 Reading guide

Maintaining page content/markup: Part C *Landing content* + *Samples modal* + `DESIGN-KWEB-001` §2–5. Touching build/deploy: Part C *Composition & hosting* + `DESIGN-KWEB-001` §6–7. Reviewers: Part A + §C acceptance.

### B.5 Status & ownership

Implemented and shipped (see `PLAN-KWEB-001` §4). Owned by the `diagrams/` project.

### B.6 Glossary

- **Landing page** — the static page at kymo.studio root (`packages/website/src/index.html` + `styles.css`).
- **Playground** — the React app at `/app/` (sibling spec); the landing only links to it.
- **Committed bundle** — `packages/website/app/kymo.bundle.js`, an esbuild artifact checked into git so CI never recompiles JS.
- **Cloudflare Pages** — the static host; project name `kymo-studio`.
- **CNAME / `.nojekyll`** — custom-domain mapping (`kymo.studio`) and the "serve as-is" marker.
- **OG meta** — Open-Graph / Twitter-card `<meta>` tags that drive share previews.

---

## Part C — Requirements (SRS)

Requirements use RFC-2119 keywords. Each maps to the stakeholder need(s) it satisfies.

### C.1 Functional requirements — Landing content (`FR-KW`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KW-01** | The page SHALL present a top navigation with links to the **Playground** (`app/`), the **Samples** section (`#samples`), and **GitHub**. | SN-KW-03 |
| **FR-KW-02** | The page SHALL present a hero: headline, lead description of the DSL, a **copyable install command** (`uv tool install git+https://github.com/kymostudio/kymostudio`), and CTAs (Open playground / View on GitHub / See samples). | SN-KW-02, SN-KW-03 |
| **FR-KW-03** | The page SHALL show a **hero preview** of a real rendered diagram — the animated NVIDIA-AIQ WebP from the repo `samples/` corpus (GitHub raw CDN). | SN-KW-02 |
| **FR-KW-04** | The page SHALL present a **samples grid** of cards; each card SHALL carry a thumbnail (rendered SVG), title, description, and metadata (filename · dimensions), driven by `data-*` attributes (source / preview / GitHub URLs). | SN-KW-04 |
| **FR-KW-05** | The page SHALL present a footer linking to the GitHub repo and stating the Apache-2.0 license. | SN-KW-03 |

### C.2 Functional requirements — Samples modal (`FR-KW`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KW-06** | Clicking a sample card SHALL open a **modal** that fetches the card's `.kymo` source from the GitHub raw CDN, **syntax-highlights** it inline, and shows it **side-by-side** with the rendered SVG, plus a View-on-GitHub link. | SN-KW-04 |
| **FR-KW-07** | The modal SHALL be dismissable via the **Escape** key, the overlay, and a close (✕) button, restoring the page scroll state. | SN-KW-04 |
| **FR-KW-08** | On a failed source fetch the modal SHALL show graceful fallback text ("open on GitHub instead") and SHALL NOT break the page. | SN-KW-04 |

### C.3 Functional requirements — Discoverability / SEO (`FR-KW`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KW-09** | The page SHALL declare `<title>` + `description` and **Open-Graph** + **Twitter `summary_large_image`** meta (title, description, image = the AIQ WebP, url) for good share cards. | SN-KW-05 |
| **FR-KW-10** | The page SHALL set a favicon (inline SVG data URI — the kymo-green rounded square). | SN-KW-05 |

### C.4 Functional requirements — Composition & hosting (`FR-KW`)

| ID | Requirement | Source need |
|----|-------------|-------------|
| **FR-KW-11** | The site build SHALL assemble one deploy artifact `dist/`: the landing (`src/` → `dist/`) at the root and the playground (`app/index.html` + the committed `app/kymo.bundle.js` → `dist/app/`) under `/app/`. A normal build SHALL NOT recompile JS. | SN-KW-06 |
| **FR-KW-12** | A push to `main` touching `packages/website/**` SHALL build and deploy `dist/` to the **Cloudflare Pages project `kymo-studio`** (also `workflow_dispatch`). | SN-KW-06 |
| **FR-KW-13** | The deploy SHALL serve the site at the custom domain **kymo.studio** via `CNAME`, with `.nojekyll` to publish files as-is. | SN-KW-06 |

### C.5 Non-functional requirements (ISO/IEC 25010) (`NFR-KW`)

| ID | Attribute | Requirement |
|----|-----------|-------------|
| **NFR-KW-01** | Performance efficiency | First paint MUST require no framework boot or server call; the only landing JS is the inline modal script. Heavy media (WebP/SVG) loads from a CDN. |
| **NFR-KW-02** | Operability | The site MUST deploy as a **static artifact** to Cloudflare Pages with **no server**, fully automated on push. |
| **NFR-KW-03** | Portability | The landing MUST be hand-authored HTML/CSS with **no build step**; the playground bundle MUST be a committed artifact (build copies, never compiles). |
| **NFR-KW-04** | Maintainability | Samples MUST be expressed as `data-*`-driven cards and visual style MUST live in design tokens in `styles.css`, so adding a sample or retheming is a localized edit. |
| **NFR-KW-05** | Compatibility | The page MUST be responsive (dark theme, `clamp()` hero scaling, modal stacking on narrow viewports) and degrade gracefully without JS (static content remains readable). |

### C.6 Out of scope / deferred

The `/app/` playground internals (sibling spec); `editor.kymo.studio`; analytics, A/B testing,
cookie/consent, auth, server-rendered content, a docs/blog CMS. Any of these implies state or
compute the static landing deliberately avoids.

### C.7 Acceptance criteria (feature-level)

1. kymo.studio loads instantly as static HTML; nav links reach playground / samples / GitHub; the install command is selectable/copyable.
2. The hero shows the animated AIQ preview; the samples grid renders all cards with thumbnails + metadata.
3. Clicking a card opens the modal with syntax-highlighted source beside the rendered SVG; Escape/overlay/✕ close it; a failed fetch shows fallback text.
4. The page exposes OG/Twitter meta and a favicon (a share preview shows title + description + image).
5. `build.sh` produces `dist/index.html` (+ `styles.css`/`CNAME`/`.nojekyll`) and `dist/app/{index.html,kymo.bundle.js}` without recompiling JS.
6. A push touching `packages/website/**` deploys `dist/` to the `kymo-studio` Pages project at kymo.studio.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-10 | Vũ Anh | Initial requirements for the shipped kymo.studio **landing page**. Owns `SN-KW-01..06`, `FR-KW-01..13` (landing content, samples modal, SEO, composition & hosting), `NFR-KW-01..05`. Scope is landing-only; the `/app/` playground (`FEAT-CANVAS-001`/`FEAT-STUDIO-001`) and `editor.kymo.studio` (`FEAT-KEDITOR-001`) are referenced, not documented. Retrospective spec for the page introduced in PR #192 (`0b408f6`) and shipped via Cloudflare Pages (see `PLAN-KWEB-001` §4). |
