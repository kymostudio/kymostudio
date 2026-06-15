---
title: Kymo Editor — Agent / LLM host via MCP (user group + JTBD)
document_id: USR-KEDITOR-003
version: "0.1"
issue_date: 2026-06-16
status: Draft
classification: Internal
owner: diagrams/ project
audience: Product + engineering scoping the MCP automation surface
review_cycle: On a notable product change, or when feeding a new spec
supersedes: null
parent_document: PRD-KEDITOR-001
related_documents:
  - PRD-KEDITOR-001
  - FEAT-KEMCP-001
  - FEAT-KLIVE-001
authors:
  - Vũ Anh
language: en
keywords:
  - jtbd
  - agent
  - mcp
  - llm
  - automation
  - editor-kymo-studio
---

# Agent / LLM host (MCP)

| Field             | Value |
|-------------------|-------|
| Document ID       | `USR-KEDITOR-003` |
| Version           | 0.1 |
| Status            | Draft (living) |
| Parent            | `PRD-KEDITOR-001` (editor product analysis — index) |
| Related Documents | `FEAT-KEMCP-001` · `FEAT-KLIVE-001` |

> **What this is.** The per-group **JTBD + current-state** read for the **agent / LLM host** — one of
> four groups split out of the editor product analysis (`PRD-KEDITOR-001`). **Non-normative / pre-spec**;
> committed requirements live in `docs/specs/kymo-editor/`. Gap IDs (`G#`) are the master list in
> `PRD-KEDITOR-001` §6.

**Who.** Claude Desktop / Cursor / claude.ai talking to `mcp.kymo.studio` (OAuth-gated). **Not a
separate population** — a second door into a **signed-in user's** own diagrams (`USR-KEDITOR-002`).

---

## 1. Core job (JTBD)

> *"Author and update the user's diagrams for them, and have the change show up where they're already looking."*

The agent acts *on behalf of* a signed-in user: it makes the diagram so the user doesn't have to type
the DSL, and the result lands in the user's library — live in whatever tab they have open.

## 2. Job stories

*Form: When [situation], I want to [motivation], so I can [outcome].*

- **J-A1 — Draw on request.** When the user asks me (the agent) to draw or change a diagram, I want to
  create/edit it in *their* library and return the `?d=` link, so they see it appear **live in their open
  tab**.
- **J-A2 — Edit the right one.** When I need to act on existing work, I want to `list`/`get` their
  diagrams, so I target the correct document.

## 3. How the product answers (current state)

- A second door into a **signed-in user's** own diagrams: `new` / `list` / `edit` / `get` /
  `delete_diagram` (OAuth-gated). Edits land **live in the user's open tabs** (J-A1); responses return
  the `?d=` URL + live-tab count; `list`/`get` target the right document (J-A2). Scoped to that user;
  `delete` is soft; no workspace/render tools.
- **Job not served:** no agent-driven multi-user / cross-account authoring (the agent is bounded to the
  one user it authenticated as).

## 4. Competitive landscape (this group) — *kymo leads*

Survey method + the product table are in `PRD-KEDITOR-001` §7.

- **Who competes:** essentially **no public product offers a live "agent edits your diagram" channel**
  today. [FigJam](https://www.figma.com/figjam/) markets *"a visual whiteboard for your coding agent"*
  (aspirational positioning, not a verifiable MCP tool surface); mermaid has community MCP servers
  (render-oriented), not a hosted live-edit channel.
- **kymo edge:** a hosted, OAuth-gated **MCP** (`new/list/edit/get/delete_diagram`) editing the user's
  diagrams **live in their open tabs** — a dev-native automation surface none of the visual incumbents match.
- **kymo gap:** scoped to the user's own diagrams; no agent multi-user; MCP is niche vs a visible "AI" button.
- **Takeaway:** kymo's clearest lead — a live MCP channel no incumbent matches.

## 5. Gaps affecting this group

> Master list + framing in `PRD-KEDITOR-001` §6. Non-normative; each becomes a CR only if chosen.

- No agent-specific gap is tracked in the master list today; the agent inherits the signed-in author's
  collaboration limits (**G2/G4**) because it operates inside that user's room.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-16 | Vũ Anh | Split out of `PRD-KEDITOR-001` v0.3 into a per-group file. Core job + job stories (J-A1–J-A2), current-state read (MCP as a second client of the signed-in library), and this group's competitive landscape. |
