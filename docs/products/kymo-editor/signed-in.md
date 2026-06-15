---
title: Kymo Editor — Signed-in author (user group + JTBD)
document_id: USR-KEDITOR-002
version: "0.1"
issue_date: 2026-06-16
status: Draft
classification: Internal
owner: diagrams/ project
audience: Product + engineering scoping the room-backed editor surface
review_cycle: On a notable product change, or when feeding a new spec
supersedes: null
parent_document: PRD-KEDITOR-001
related_documents:
  - PRD-KEDITOR-001
  - FEAT-KLIBRARY-001
  - FEAT-KLIVE-001
  - FEAT-KHOME-001
authors:
  - Vũ Anh
language: en
keywords:
  - jtbd
  - signed-in
  - library
  - autosave
  - live-sync
  - editor-kymo-studio
---

# Signed-in author

| Field             | Value |
|-------------------|-------|
| Document ID       | `USR-KEDITOR-002` |
| Version           | 0.1 |
| Status            | Draft (living) |
| Parent            | `PRD-KEDITOR-001` (editor product analysis — index) |
| Related Documents | `FEAT-KLIBRARY-001` · `FEAT-KLIVE-001` · `FEAT-KHOME-001` |

> **What this is.** The per-group **JTBD + current-state** read for the **signed-in author** — one of
> four groups split out of the editor product analysis (`PRD-KEDITOR-001`). **Non-normative / pre-spec**;
> committed requirements live in `docs/specs/kymo-editor/`. Gap IDs (`G#`) are the master list in
> `PRD-KEDITOR-001` §6.

**Who.** A returning author (Google sign-in) who wants their diagrams **kept and organised**. Inherits
the whole guest surface (`USR-KEDITOR-001`) and adds persistence.

---

## 1. Core job (JTBD)

> *"Keep my diagrams in one place and keep them current as my work changes."*

The guest's job ends at "make one diagram"; this group's job begins at "and keep it" — find it again,
edit it without losing work, organise a growing set.

## 2. Job stories

*Form: When [situation], I want to [motivation], so I can [outcome].*

- **J-S1 — Keep it.** When I'll need a diagram again, I want to **Save** it to my own library, so I can
  find and reopen it later from any tab.
- **J-S2 — Never lose / never merge.** When I edit, I want it to autosave and stay in sync across my own
  tabs, so I never lose work or reconcile copies by hand.
- **J-S3 — Find it later.** When my library grows, I want folders, search and thumbnails, so I can
  locate the right diagram quickly.
- **J-S4 — Undo a mistake.** When I delete the wrong thing, I want a **Trash** to restore from, so a
  slip isn't permanent (30-day window).
- **J-S5 — Name for humans.** When a diagram matters, I want to rename it and have the name stick, so my
  library reads clearly.

## 3. How the product answers (current state)

- Inherits everything a guest has, plus **persistence + organisation**: each diagram is a `?d=`
  document that autosaves (J-S2), **live-syncs across the user's own tabs** (J-S2), renames in the header
  (J-S5), and lives in a **VS Code-style shell** (Explorer folder tree, Search, Templates) with
  thumbnails (J-S3) and a **Trash** (soft-delete, restore, 30-day auto-purge → J-S4).
- **Jobs not yet served:** there is no *"co-edit one document with my teammates"* job-answer — rooms are
  **owner-only** (another account opening your `?d=` is refused, 403); no cursors/presence, no durable
  **version history** beyond the 30-day Trash window. Sharing *for others to co-edit a server document*
  falls back to `?s=` (each recipient gets an **unsynced copy**) → **G2/G3/G4**; a dropped socket shows
  "Offline" with no timed auto-reconnect → **G5**.

## 4. Competitive landscape (this group) — *kymo's weakest segment*

Survey method + the product table are in `PRD-KEDITOR-001` §7.

- **Who competes:** **mermaid.ai** (paid: storage, team collab, AI), [Lucidchart](https://www.lucidchart.com)
  (cloud library, layers, data-linking, AI), [Miro](https://miro.com) / [FigJam](https://www.figma.com/figjam/)
  (cloud + real-time multiplayer). All gate behind an account and all sell the **persistence +
  collaboration** kymo's signed-in tier targets.
- **kymo ahead:** account-*optional* (sign in only to *keep*, not to *use*); clean VS Code shell + folder
  tree + Trash; OSS/self-hostable; the same diagram is still a shareable `?s=` link.
- **kymo behind (grounded gaps):** **no real-time multi-user collab** (Miro/FigJam core, Lucid has it,
  even mermaid.ai advertises "edit together in real-time") — kymo only live-syncs the owner's own tabs
  (**G2**); **no visual editing / no built-in AI-generate** (Lucid AI + drag, mermaid.ai AI + drag-drop,
  Miro/FigJam AI); **no durable version history** (**G3**).
- **Reading:** for "keep · organise · collaborate", the field is richer; kymo wins on *openness +
  low-friction + dev-fit*, not on collaboration/AI breadth. Biggest upside = real-time collaboration (**G2**).

## 5. Gaps affecting this group

> Master list + framing in `PRD-KEDITOR-001` §6. Non-normative; each becomes a CR only if chosen.

- **G2** — No collaborative sharing of a **server** document (only `?s=` copies). *Puts the **keep**
  job at risk when "keep" implies "with my team"; the most-requested expectation.*
- **G3** — No durable version history (Trash is a 30-day recovery window). *Touches **J-S4**.*
- **G4** — No **viewer / comment** role — only author or owner; no read-only share, no presence.
- **G5** — No timed WebSocket auto-reconnect (a drop shows "Offline" until reload). *Touches **J-S2**;
  tracked as R10 in `PLAN-KEDITOR-001`.*

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-16 | Vũ Anh | Split out of `PRD-KEDITOR-001` v0.3 into a per-group file. Core job + job stories (J-S1–J-S5), current-state read, this group's competitive landscape, and the gaps that touch it (G2–G5). |
