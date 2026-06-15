---
title: Kymo Editor — Guest / anonymous author (user group + JTBD)
document_id: USR-KEDITOR-001
version: "0.1"
issue_date: 2026-06-16
status: Draft
classification: Internal
owner: diagrams/ project
audience: Product + engineering scoping the signed-out editor surface
review_cycle: On a notable product change, or when feeding a new spec
supersedes: null
parent_document: PRD-KEDITOR-001
related_documents:
  - PRD-KEDITOR-001
  - FEAT-KRENDER-001
  - FEAT-KSHARE-001
  - FEAT-KHOME-001
authors:
  - Vũ Anh
language: en
keywords:
  - jtbd
  - guest
  - anonymous
  - account-free
  - share
  - editor-kymo-studio
---

# Guest / anonymous author

| Field             | Value |
|-------------------|-------|
| Document ID       | `USR-KEDITOR-001` |
| Version           | 0.1 |
| Status            | Draft (living) |
| Parent            | `PRD-KEDITOR-001` (editor product analysis — index) |
| Related Documents | `FEAT-KRENDER-001` · `FEAT-KSHARE-001` · `FEAT-KHOME-001` |

> **What this is.** The per-group **JTBD + current-state** read for the **guest / anonymous author** —
> one of four groups split out of the editor product analysis (`PRD-KEDITOR-001`). **Non-normative /
> pre-spec**: it feeds the feature specs and cites them by `document_id`; committed requirements live in
> `docs/specs/kymo-editor/`. Gap IDs (`G#`) are the master list in `PRD-KEDITOR-001` §6.

**Who.** Anyone on `editor.kymo.studio` who is **not signed in** — including a **recipient** who opens a
`?s=` share link. The widest surface and the most users.

---

## 1. Core job (JTBD)

> *"Turn text into a clean diagram and get it somewhere useful — right now, no account, no setup."*

This group hires the editor to make one diagram and move on. The whole signed-out surface is
**deliberately stripped to that single job** — author → render → share/export — with chrome a guest
can't act on (library tab, persisted name, editor file-tab, Save-state pill) kept out of the way.

## 2. Job stories

*Form: When [situation], I want to [motivation], so I can [outcome].*

- **J-G1 — Render fast.** When I need a diagram for a doc/PR/chat *now*, I want to type it and watch it
  render, so I can use it without installing or signing up.
- **J-G2 — Just-render my paste.** When I paste DSL from elsewhere, I want it to render without me
  picking a format, so I don't fight settings (paste auto-detect of kind).
- **J-G3 — Get it out.** When it looks right, I want to share or export it (link, SVG, PNG, Markdown
  image), so a teammate or a README can use it without an account.
- **J-G4 — Start clean.** When I want a different diagram, I want a fast **New** + a template, so I'm
  never staring at a blank box.

## 3. How the product answers (current state)

- Closed authoring loop **offline-capable** (kymo + Mermaid render in-browser) → J-G1/J-G2. The work
  travels in the URL (`?s=`), so sharing needs no account and the recipient can edit + re-share their own
  copy → J-G3. **New** opens the template gallery → J-G4.
- **Boundaries / pain:** a draft lives **only in the URL** — closing the tab without copying the link or
  signing in to **Save** loses it (no Recent/history); very long sources can exceed chat-app URL limits
  (>2 000-char warning). These are the moments a guest's job *fails* → **G1**.
- **Conversion moment:** **Save** prompts Google sign-in, then auto-replays the save — the single,
  well-placed guest → signed-in funnel. It fires exactly when J-G* succeeds and the *next* job
  (**keep it** → signed-in author, `USR-KEDITOR-002`) appears.

## 4. Competitive landscape (this group) — *kymo's home turf*

Survey method + the product table are in `PRD-KEDITOR-001` §7.

- **Who actually competes:** only the **account-free** tools — [mermaid.live](https://mermaid.live)
  (text-DSL, `#pako` URL share, OSS) and [demo.bpmn.io](https://demo.bpmn.io) (visual BPMN, local-file
  export). Lucid / Miro / FigJam **don't serve this group at all** (login-gated) → the no-account segment
  is a 3-way space: kymo · mermaid · bpmn.io.
- **vs mermaid.live (closest rival):** parity on text→render + account-free URL share + OSS. **kymo
  ahead** — animated SVG, 28 kroki kinds + BPMN import, more export targets (Figma/Excalidraw/WebP/PDF).
  **mermaid ahead** — larger first-class diagram-type catalogue (~27) + far bigger mindshare.
- **vs demo.bpmn.io:** different modality (visual modeling toolkit, no URL share) — complementary, not a
  direct guest rival (kymo *imports* the `.bpmn` it produces).
- **kymo edge:** the only one with animated SVG + kroki-style URL share + multi-format export at zero account.
- **kymo gap:** no visual/drag entry for non-coders (mermaid.ai / bpmn.io have it); guest draft is URL-only.
- **Takeaway:** kymo ≈ "mermaid.live + animation + more formats" — and owns the no-account segment with it.

## 5. Gaps affecting this group

> Master list + framing in `PRD-KEDITOR-001` §6. Non-normative; each becomes a CR only if chosen.

- **G1** — A guest draft is lost on tab-close unless Saved/copied (URL-only). *Puts **J-G1/J-G3** at
  risk.* e.g. a local "recent drafts" cache for guests.
- **G4** — No **viewer / comment** role (read-only share / presence) — affects all groups, incl. a guest
  recipient who only wants to *view*.

**Test-coverage note.** This group has the widest surface and the most users, yet automated E2E covers
only the **Welcome** today (`editor-home`, 6 TCs); guest render / share / export are **manual**-only —
the highest-value place to extend automation next.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-16 | Vũ Anh | Split out of `PRD-KEDITOR-001` v0.3 into a per-group file. Core job + job stories (J-G1–J-G4), current-state read, this group's competitive landscape, and the gaps that touch it (G1/G4). Notes the signed-out surface stripped to its single job (author → render → share/export). |
