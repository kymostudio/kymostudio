---
title: Kymo Editor — Product Analysis (users, capabilities, current state)
document_id: PRD-KEDITOR-001
version: "0.2"
issue_date: 2026-06-15
status: Draft
classification: Internal
owner: diagrams/ project
audience: Product + engineering; anyone scoping editor.kymo.studio work before it becomes a spec
review_cycle: On a notable product change, or when feeding a new spec
supersedes: null
related_documents:
  - FEAT-KEDITOR-001
  - FEAT-KRENDER-001
  - FEAT-KSHARE-001
  - FEAT-KLIVE-001
  - FEAT-KLIBRARY-001
  - FEAT-KEMCP-001
  - FEAT-KHOME-001
authors:
  - Vũ Anh
language: en
keywords:
  - product-analysis
  - users
  - actors
  - personas
  - capabilities
  - current-state
  - editor-kymo-studio
  - gaps
  - opportunities
---

# Kymo Editor — Product Analysis

| Field             | Value |
|-------------------|-------|
| Document ID       | `PRD-KEDITOR-001` |
| Version           | 0.2 |
| Status            | Draft (living) |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KEDITOR-001` (the umbrella spec) and its six module specs (`FEAT-KRENDER-001` / `FEAT-KSHARE-001` / `FEAT-KLIVE-001` / `FEAT-KLIBRARY-001` / `FEAT-KEMCP-001` / `FEAT-KHOME-001`) |

> **What this is.** A **product-level, current-state** analysis of the editor at
> **editor.kymo.studio** — who uses it, what each group can do today, where the boundaries and gaps
> are. It is the **discovery / pre-spec** layer (`docs/products/`): **non-normative** and descriptive.
> The committed "what the system SHALL do" lives in the feature specs (`docs/specs/kymo-editor/`,
> Part A ConOps/StRS + Part C SRS); this doc **feeds** those and links to them by `document_id`. When a
> gap here is chosen for delivery, it becomes a **CR** under `docs/specs/kymo-editor/CR/` or a new
> requirement — not a line in this file.

---

## 1. Scope & method

In scope: the shipped product surface of `editor.kymo.studio` and its serverless backends
(`mcp.kymo.studio`, `render.kymo.studio`), grouped by **user**. Derived from the six as-built module
specs and a code-level audit of `packages/editor/web/`. Out of scope: the engine internals, the CLI,
and the publishable libraries (separate products).

## 2. User groups (actors)

| Actor | Who | Primary intent |
|-------|-----|----------------|
| **Guest / anonymous author** | Anyone on `editor.kymo.studio`, not signed in (incl. a **recipient** opening a `?s=` share link). | Try / author / share **with no account**. |
| **Signed-in author** (Google) | A returning author who wants their diagrams kept and organised. | Keep, organise, autosave, sync across own tabs. |
| **Agent / LLM host** (MCP) | Claude Desktop / Cursor / claude.ai over `mcp.kymo.studio` (OAuth-gated). | Author into the signed-in user's diagrams, live. |
| **Operator** | Whoever deploys + runs the three artefacts. | Zero-ops hosting. |

## 3. Capability map (actor × capability)

| Capability | Guest | Signed-in | Agent | Operator |
|------------|:---:|:---:|:---:|:---:|
| Welcome home (Start / Templates / Learn) | ✅ | ✅ (+ Recent) | — | — |
| Author + render (kymo & Mermaid in-browser; 28 kinds via render.kymo.studio) | ✅ | ✅ | — | — |
| Kind switch + samples, paste auto-detect, zoom/pan, CodeMirror | ✅ | ✅ | — | — |
| Export SVG / PNG / source | ✅ | ✅ | — | — |
| `?s=` URL share (account-free) + Share popover (copy / MD link / MD image) | ✅ | ✅ | — | — |
| Open local file → draft | ✅ | ✅ | — | — |
| **Save** (draft → `?d=` document) | ❌ → prompts sign-in | ✅ | ✅ (`new`/`edit`) | — |
| Library: folder tree, search, thumbnails, Trash (soft-delete + 30-day purge) | ❌ | ✅ | ⚠️ `list`/`delete` only | — |
| Autosave + live-sync across own tabs | ❌ | ✅ | ✅ (pushes live) | — |
| Rename (persisted) | ❌ | ✅ | ✅ | — |
| Open `?d=` room (owner-only) | ❌ | ✅ (own) | ✅ (user's own) | — |
| MCP tools: `new` / `list` / `edit` / `get` / `delete_diagram` | — | — | ✅ | — |
| Deploy / `ALLOWED_EMAILS` allowlist / purge cron | — | — | — | ✅ |

**The account boundary (`FR-LV-02`).** Everything in *authoring + share + export* works **with no
account**; only **room-backed** features (library, autosave, live-sync, persisted rename) require
sign-in. The signed-out path is a first-class product surface, not a limited trial.

## 4. Per-group analysis

### 4.1 Guest / anonymous author — *"try now, no friction"*
- Closed authoring loop **offline-capable** (kymo + Mermaid render in-browser); the work travels in the
  URL (`?s=`), so sharing needs no account and the recipient can edit + re-share their own copy.
- **Boundaries / pain:** a draft lives **only in the URL** — closing the tab without copying the link
  or signing in to Save loses it (the "Unsaved" pill warns but does not rescue it); no Recent/history;
  very long sources can exceed chat-app URL limits (>2 000-char warning).
- **Conversion moment:** **Save** prompts Google sign-in, then auto-replays the save — the single,
  well-placed guest → signed-in funnel (fires when the user has something worth keeping).

### 4.2 Signed-in author — *"keep & organise"*
- Inherits everything a guest has, plus **persistence + organisation**: each diagram is a `?d=`
  document that autosaves, **live-syncs across the user's own tabs**, renames in the header, and lives
  in a **VS Code-style shell** (Explorer folder tree, Search, Templates) with thumbnails and a **Trash**
  (soft-delete, restore, 30-day auto-purge).
- **Boundaries:** rooms are **owner-only** (another account opening your `?d=` is refused, 403). No
  multi-user collaboration, cursors/presence, or durable version history (Trash is a 30-day window).
- **Pain:** sharing *for others to co-edit a server document* doesn't exist → still use `?s=` (each
  recipient gets an unsynced copy); a dropped socket shows "Offline" (no timed auto-reconnect).

### 4.3 Agent / LLM host (MCP) — *"a second client of the user's library"*
- Not a separate population — a second door into a **signed-in user's** own diagrams: `new`/`list`/
  `edit`/`get`/`delete_diagram`, edits landing live in the user's open tabs, responses returning the
  `?d=` URL + live-tab count. Scoped to that user; `delete` is soft; no workspace/render tools.

### 4.4 Operator — *"zero-ops"*
- Deploys **three** artefacts (Cloudflare Pages static site + the `kymo-mcp` Worker + the
  `render.kymo.studio` Worker) and leaves them; no VM/container. Controls: `ALLOWED_EMAILS` allowlist
  (empty = open), a daily purge cron, server-side JWKS token verification.

## 5. Product shape (the funnel)

A clear progression placed on one seam: **Guest (try) → *Save* → Signed-in (keep / organise) →
Agent (automate)**. A single account boundary (`FR-LV-02`) separates "use right now" from "needs an
account" — easy to understand, easy to test. The agent and operator are not stages but *adjacent*
clients/roles around the signed-in spine.

## 6. Gaps & opportunities (non-normative)

> Candidates for a future spec/CR — **not** commitments. Each would be raised as a CR under
> `docs/specs/kymo-editor/CR/` if chosen.

| # | Gap | Affected group | Note |
|---|-----|----------------|------|
| G1 | A guest draft is lost on tab-close unless Saved/copied (URL-only). | Guest | e.g. a local "recent drafts" cache for guests. |
| G2 | No collaborative sharing of a **server** document (only `?s=` copies). | Signed-in | the most-requested "keep" expectation. |
| G3 | No durable version history (Trash is a 30-day recovery window). | Signed-in | |
| G4 | No **viewer / comment** role — only author or owner; no read-only share, no presence. | All | |
| G5 | No timed WebSocket auto-reconnect (a drop shows "Offline" until reload). | Signed-in | tracked as R10 in `PLAN-KEDITOR-001`. |

**Test-coverage note (current state).** The **guest** group has the widest surface and the most users,
yet automated E2E covers only the **Welcome** today (`editor-home`, 6 TCs); guest render / share /
export are **manual**-only — the highest-value place to extend automation next.

---

## 7. Competitive landscape (by user group)

Surveyed **2026-06-15** by direct browsing. **Observation depth:** *hands-on* (entered the live editor)
for **mermaid.live** and **demo.bpmn.io**; *landing/product-page only* (editor behind login, not signed
in) for **Lucidchart**, **Miro**, **FigJam**. Competitors are external products → cited as plain links.
The lens is **per user group** (§2): different products compete for different groups.

| Product | What it is | Observed |
|---------|------------|----------|
| [mermaid.live](https://mermaid.live) | OSS text-DSL diagram editor (paid tier → mermaid.ai) | hands-on |
| [demo.bpmn.io](https://demo.bpmn.io) | bpmn-js **visual** BPMN modeler demo (OSS embeddable toolkit) | hands-on |
| [Lucidchart](https://www.lucidchart.com) | Enterprise **visual** diagramming (AI, data-linking, UML markup, layers) | landing |
| [Miro](https://miro.com) | Infinite-canvas **team collaboration** ("AI Innovation Workspace") | landing |
| [FigJam](https://www.figma.com/figjam/) | Collaborative **whiteboard** for teams | landing |

### 7.1 Guest / anonymous author — *kymo's home turf*
- **Who actually competes:** only the **account-free** tools — **mermaid.live** (text-DSL, `#pako` URL
  share, OSS) and **demo.bpmn.io** (visual BPMN, local-file export). Lucid / Miro / FigJam **don't serve
  this group at all** (login-gated) → the no-account segment is a 3-way space: kymo · mermaid · bpmn.io.
- **vs mermaid.live (closest rival):** parity on text→render + account-free URL share + OSS. **kymo
  ahead** — animated SVG, 28 kroki kinds + BPMN import, more export targets (Figma/Excalidraw/WebP/PDF).
  **mermaid ahead** — larger first-class diagram-type catalogue (~27) + far bigger mindshare.
- **vs demo.bpmn.io:** different modality (visual modeling toolkit, no URL share) — complementary, not a
  direct guest rival (kymo *imports* the `.bpmn` it produces).
- **kymo edge:** the only one with animated SVG + kroki-style URL share + multi-format export at zero account.
- **kymo gap:** no visual/drag entry for non-coders (mermaid.ai / bpmn.io have it); guest draft is URL-only.

### 7.2 Signed-in author — *kymo's weakest segment*
- **Who competes:** **mermaid.ai** (paid: storage, team collab, AI), **Lucidchart** (cloud library,
  layers, data-linking, AI), **Miro / FigJam** (cloud + real-time multiplayer). All gate behind an account
  and all sell the **persistence + collaboration** kymo's signed-in tier targets.
- **kymo ahead:** account-*optional* (sign in only to *keep*, not to *use*); clean VS Code shell + folder
  tree + Trash; OSS/self-hostable; the same diagram is still a shareable `?s=` link.
- **kymo behind (grounded gaps):** **no real-time multi-user collab** (Miro/FigJam core, Lucid has it,
  even mermaid.ai advertises "edit together in real-time") — kymo only live-syncs the owner's own tabs
  (**G2**); **no visual editing / no built-in AI-generate** (Lucid AI + drag, mermaid.ai AI + drag-drop,
  Miro/FigJam AI); **no durable version history** (**G3**).
- **Reading:** for "keep · organise · collaborate", the field is richer; kymo wins on *openness +
  low-friction + dev-fit*, not on collaboration/AI breadth.

### 7.3 Agent / LLM host (MCP) — *kymo leads*
- **Who competes:** essentially **no public product offers a live "agent edits your diagram" channel**
  today. FigJam markets *"a visual whiteboard for your coding agent"* (aspirational positioning, not a
  verifiable MCP tool surface); mermaid has community MCP servers (render-oriented), not a hosted
  live-edit channel.
- **kymo edge:** a hosted, OAuth-gated **MCP** (`new/list/edit/get/delete_diagram`) editing the user's
  diagrams **live in their open tabs** — a dev-native automation surface none of the visual incumbents match.
- **kymo gap:** scoped to the user's own diagrams; no agent multi-user; MCP is niche vs a visible "AI" button.

### 7.4 Operator / embedder — *OSS vs SaaS*
- **Who competes:** the **OSS toolkits** — **mermaid** and **bpmn-js** are embeddable, self-hostable
  libraries; Lucid / Miro / FigJam are **closed SaaS** (no self-host).
- **kymo edge:** OSS with **three implementations** (Python / JS / Rust) + a zero-ops serverless deploy;
  embeddable like mermaid/bpmn-js but with the animated renderer + multi-format pipeline.
- **kymo gap:** smaller ecosystem/mindshare than mermaid/bpmn-js; the hosted backend (rooms/library) adds
  an operational surface the pure libraries don't.

### 7.5 Takeaways (one line per group)
- **Guest:** kymo ≈ "mermaid.live + animation + more formats" — and owns the no-account segment with it.
- **Signed-in:** crowded, feature-rich; kymo trades collab/AI breadth for openness + dev-fit. Biggest
  upside = real-time collaboration (**G2**).
- **Agent:** kymo's clearest lead — a live MCP channel no incumbent matches.
- **Operator/embedder:** competes with OSS mermaid/bpmn-js on openness; differentiates on animation +
  multi-format + three-language.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-15 | Vũ Anh | Initial product analysis for `editor.kymo.studio`: four user groups, an actor × capability map (current state), per-group analysis, the account-boundary funnel, and a non-normative gap/opportunity list (G1–G5). Derived from the six module specs + a code audit. First doc under the new `docs/products/` (pre-spec, discovery) layer; links to `FEAT-KEDITOR-001` by `document_id`. |
| 0.2     | 2026-06-15 | Vũ Anh | Added **§7 Competitive landscape (by user group)** — mermaid.live, demo.bpmn.io, Lucidchart, Miro, FigJam, surveyed by direct browsing (hands-on for mermaid.live + demo.bpmn.io; landing-only for the login-walled three). Per-group positioning: guest (kymo owns the no-account segment vs mermaid/bpmn.io), signed-in (weakest — no real-time collab/AI/history), agent (clear lead via MCP), operator/embedder (OSS vs SaaS). |
