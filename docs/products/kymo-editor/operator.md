---
title: Kymo Editor — Operator / embedder (user group + JTBD)
document_id: USR-KEDITOR-004
version: "0.1"
issue_date: 2026-06-16
status: Draft
classification: Internal
owner: diagrams/ project
audience: Product + engineering scoping deployment + hosting
review_cycle: On a notable product change, or when feeding a new spec
supersedes: null
parent_document: PRD-KEDITOR-001
related_documents:
  - PRD-KEDITOR-001
  - FEAT-KEDITOR-001
  - FEAT-KEMCP-001
  - FEAT-KLIVE-001
authors:
  - Vũ Anh
language: en
keywords:
  - jtbd
  - operator
  - embedder
  - deployment
  - zero-ops
  - self-host
  - editor-kymo-studio
---

# Operator / embedder

| Field             | Value |
|-------------------|-------|
| Document ID       | `USR-KEDITOR-004` |
| Version           | 0.1 |
| Status            | Draft (living) |
| Parent            | `PRD-KEDITOR-001` (editor product analysis — index) |
| Related Documents | `FEAT-KEDITOR-001` · `FEAT-KEMCP-001` · `FEAT-KLIVE-001` |

> **What this is.** The per-group **JTBD + current-state** read for the **operator / embedder** — one of
> four groups split out of the editor product analysis (`PRD-KEDITOR-001`). **Non-normative / pre-spec**;
> committed requirements live in `docs/specs/kymo-editor/`. Gap IDs (`G#`) are the master list in
> `PRD-KEDITOR-001` §6.

**Who.** Whoever **deploys + runs** the three artefacts (or embeds the OSS stack). Not an end-user of
the editor — the role that keeps it online.

---

## 1. Core job (JTBD)

> *"Run the whole product without operating any servers."*

The operator hires kymo's architecture, not its diagrams: they want it hosted, access-controlled, and
self-tidying — then forgotten.

## 2. Job stories

*Form: When [situation], I want to [motivation], so I can [outcome].*

- **J-O1 — Ship and forget.** When I deploy, I want static + serverless artefacts with no VM/container,
  so there's nothing to keep alive.
- **J-O2 — Control access.** When I host it for a known group, I want an email allowlist + server-side
  token verification, so only the right people get rooms.
- **J-O3 — Stay tidy.** When data piles up, I want soft-deletes to purge themselves, so storage doesn't
  grow unbounded.

## 3. How the product answers (current state)

- Deploys **three** artefacts (Cloudflare Pages static site + the `kymo-mcp` Worker + the
  `render.kymo.studio` Worker) and leaves them; no VM/container (J-O1). Controls: `ALLOWED_EMAILS`
  allowlist (empty = open) + server-side JWKS token verification (J-O2), a daily purge cron (J-O3).

## 4. Competitive landscape (this group) — *OSS vs SaaS*

Survey method + the product table are in `PRD-KEDITOR-001` §7.

- **Who competes:** the **OSS toolkits** — **mermaid** and **bpmn-js** are embeddable, self-hostable
  libraries; Lucid / Miro / FigJam are **closed SaaS** (no self-host).
- **kymo edge:** OSS with **three implementations** (Python / JS / Rust) + a zero-ops serverless deploy;
  embeddable like mermaid/bpmn-js but with the animated renderer + multi-format pipeline.
- **kymo gap:** smaller ecosystem/mindshare than mermaid/bpmn-js; the hosted backend (rooms/library) adds
  an operational surface the pure libraries don't.
- **Takeaway:** competes with OSS mermaid/bpmn-js on openness; differentiates on animation + multi-format
  + three-language.

## 5. Gaps affecting this group

> Master list + framing in `PRD-KEDITOR-001` §6. Non-normative; each becomes a CR only if chosen.

- No operator-specific gap is tracked in the master list today; the operator's concerns surface as the
  *operational surface* trade-off noted above (the hosted backend vs the pure embeddable libraries).

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-16 | Vũ Anh | Split out of `PRD-KEDITOR-001` v0.3 into a per-group file. Core job + job stories (J-O1–J-O3), current-state read (three zero-ops artefacts), and this group's OSS-vs-SaaS competitive landscape. |
