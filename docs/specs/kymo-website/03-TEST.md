---
title: Kymo Website (kymo.studio landing page) — Verification & Validation
document_id: TEST-KWEB-001
version: "0.1"
issue_date: 2026-06-10
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers verifying the public landing page and its deploy; reviewers
review_cycle: On scope change, or when a phase completes
supersedes: null
related_documents:
  - FEAT-KWEB-001
  - DESIGN-KWEB-001
  - PLAN-KWEB-001
  - TEST-CANVAS-001
authors:
  - Vũ Anh
language: en
keywords:
  - verification
  - validation
  - iso-29119
  - test-cases
  - traceability
  - kymo-website
  - landing-page
  - static-site
  - cloudflare-pages
---

# Kymo Website (kymo.studio landing page) — Verification & Validation

| Field             | Value                                                              |
|-------------------|-------------------------------------------------------------------|
| Document ID       | `TEST-KWEB-001` |
| Version           | 0.1 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KWEB-001` (requirements), `DESIGN-KWEB-001` (design), `PLAN-KWEB-001` (plan), `TEST-CANVAS-001` (the `/app/` playground V&V — owns its own E2E, must stay green) |

> V&V per **ISO/IEC/IEEE 29119**. Test cases are `TC-KW-NN`. This document covers the **landing page** and the site packaging/deploy only. The `/app/` playground has its **own** E2E suite (`packages/website/app/e2e/`, `npm run test:e2e`, owned by `TEST-CANVAS-001`) — it is a regression gate here, not owned here.

---

## 1. Strategy

- **Landing smoke / E2E** — manual or browser-driven checks against kymo.studio (or a local `dist/` served via `npm run dev`): nav, hero, install command, samples grid, modal open/close/highlight, SEO meta, favicon.
- **Build/deploy shape** — run `build.sh` and assert the `dist/` layout; inspect `deploy-website.yml` for the path filter and Pages target.
- **Regression gate** — a landing-only edit MUST NOT change the committed `app/kymo.bundle.js`, and the playground E2E (`TEST-CANVAS-001`) MUST stay green.

## 2. Feature test cases (`TC-KW`)

| ID | Case | Steps / expectation | Verifies |
|----|------|---------------------|----------|
| **TC-KW-01** | Static load | Open kymo.studio → renders immediately, no framework boot/spinner; only the inline modal script runs. | NFR-KW-01, FR-KW-02 |
| **TC-KW-02** | Nav links | Nav resolves: Playground → `app/`, Samples → `#samples`, GitHub → repo. | FR-KW-01 |
| **TC-KW-03** | Install command | The `uv tool install …` line is present and selectable/copyable. | FR-KW-02 |
| **TC-KW-04** | Hero preview | The animated AIQ WebP loads in the framed preview. | FR-KW-03 |
| **TC-KW-05** | Samples grid | All sample cards render with thumbnail, title, description, and `filename · dimensions` meta. | FR-KW-04 |
| **TC-KW-06** | Modal open + highlight | Click a card → modal opens; source fetched from GitHub raw and syntax-highlighted; rendered SVG shown side-by-side; View-on-GitHub link set. | FR-KW-06 |
| **TC-KW-07** | Modal close | Escape, overlay click, and ✕ each close the modal and restore scroll. | FR-KW-07 |
| **TC-KW-08** | Fetch failure | Block the source fetch → modal shows fallback text; page does not break. | FR-KW-08 |
| **TC-KW-09** | SEO/share meta | `<title>`, `description`, OG (`og:title`/`description`/`image`/`url`), and Twitter `summary_large_image` are present. | FR-KW-09 |
| **TC-KW-10** | Favicon | The SVG-data-URI favicon is set. | FR-KW-10 |
| **TC-KW-11** | Responsive | At a narrow viewport the hero scales and the modal panes stack; dark theme stays legible. | NFR-KW-05 |
| **TC-KW-12** | Build shape | `./build.sh` produces `dist/{index.html,styles.css,CNAME,.nojekyll}` and `dist/app/{index.html,kymo.bundle.js}`, recompiling no JS. | FR-KW-11, NFR-KW-03 |
| **TC-KW-13** | Deploy target | `deploy-website.yml` triggers on `packages/website/**`, runs `./build.sh`, and `pages deploy … --project-name=kymo-studio`. | FR-KW-12, NFR-KW-02 |
| **TC-KW-14** | Custom domain | `src/CNAME` is `kymo.studio` and `.nojekyll` is shipped to `dist/`. | FR-KW-13 |

## 3. Regression gates (must stay green)

| Gate | Command | Expectation |
|------|---------|-------------|
| Committed bundle | `git status packages/website/app/kymo.bundle.js` | Unchanged by a landing-only edit. |
| Playground E2E | `cd packages/website && npm run test:e2e` | Owned by `TEST-CANVAS-001`; must stay green. |
| Playground typecheck | `cd packages/website && npm run typecheck` | Unaffected by landing edits. |

## 4. Non-functional verification

- **NFR-KW-01 (performance):** TC-KW-01 — no framework boot; media from CDN.
- **NFR-KW-02 (operability):** TC-KW-13 — automated static deploy, no server.
- **NFR-KW-03 (portability):** TC-KW-12 — landing has no build step; bundle copied, not compiled.
- **NFR-KW-04 (maintainability):** adding a sample is a new `data-*` `<article>`; restyle is a token edit in `styles.css` (inspect a diff).
- **NFR-KW-05 (compatibility):** TC-KW-11 — responsive + dark-theme legibility.

## 5. Traceability matrix

| Requirement | Test case(s) |
|-------------|--------------|
| FR-KW-01 | TC-KW-02 |
| FR-KW-02 | TC-KW-01, TC-KW-03 |
| FR-KW-03 | TC-KW-04 |
| FR-KW-04 | TC-KW-05 |
| FR-KW-05 | TC-KW-02 |
| FR-KW-06 | TC-KW-06 |
| FR-KW-07 | TC-KW-07 |
| FR-KW-08 | TC-KW-08 |
| FR-KW-09 | TC-KW-09 |
| FR-KW-10 | TC-KW-10 |
| FR-KW-11 | TC-KW-12 |
| FR-KW-12 | TC-KW-13 |
| FR-KW-13 | TC-KW-14 |
| NFR-KW-01 | TC-KW-01 |
| NFR-KW-02 | TC-KW-13 |
| NFR-KW-03 | TC-KW-12 |
| NFR-KW-04 | §4 (sample-card / token edit) |
| NFR-KW-05 | TC-KW-11 |

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-10 | Vũ Anh | Initial V&V. `TC-KW-01..14` covering static load, nav, install command, hero, samples grid, modal open/highlight/close/failure, SEO meta, favicon, responsive, build shape, deploy target, and custom domain. Regression gates pin the committed bundle and the playground's own E2E (owned by `TEST-CANVAS-001`). Full FR/NFR → TC traceability. |
