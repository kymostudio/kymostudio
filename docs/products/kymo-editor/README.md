# Kymo Editor — Product Analysis (index)

| Field             | Value |
|-------------------|-------|
| Document ID       | `PRD-KEDITOR-001` |
| Version           | 0.4 |
| Status            | Draft (living) |
| Owner             | `diagrams/` project |
| Per-group files   | `USR-KEDITOR-001` Guest · `USR-KEDITOR-002` Signed-in · `USR-KEDITOR-003` Agent/MCP · `USR-KEDITOR-004` Operator |
| Related Documents | `FEAT-KEDITOR-001` (the umbrella spec) and its six module specs (`FEAT-KRENDER-001` / `FEAT-KSHARE-001` / `FEAT-KLIVE-001` / `FEAT-KLIBRARY-001` / `FEAT-KEMCP-001` / `FEAT-KHOME-001`) |

> **What this is.** A **product-level, current-state** analysis of the editor at
> **editor.kymo.studio** — who uses it, what each group can do today, where the boundaries and gaps
> are. It is the **discovery / pre-spec** layer (`docs/products/`): **non-normative** and descriptive.
> The committed "what the system SHALL do" lives in the feature specs (`docs/specs/kymo-editor/`,
> Part A ConOps/StRS + Part C SRS); this doc **feeds** those and links to them by `document_id`. When a
> gap here is chosen for delivery, it becomes a **CR** under `docs/specs/kymo-editor/CR/` or a new
> requirement — not a line in this file.
>
> **This file is the index.** The deep **per-group JTBD + current-state + competitive** read lives in
> **one file per user group** (§2). This index holds only what is inherently **cross-group**: scope, the
> actor overview, the capability matrix, the funnel, the master gap list, and the competitor table.

---

## 1. Scope & method

In scope: the shipped product surface of `editor.kymo.studio` and its serverless backends
(`mcp.kymo.studio`, `render.kymo.studio`), grouped by **user**. Derived from the six as-built module
specs and a code-level audit of `packages/editor/web/`. Out of scope: the engine internals, the CLI,
and the publishable libraries (separate products).

**Organisation.** Four user groups, **one file each**, every file structured the same way: *core job
(JTBD) → job stories (When… I want… so I can…) → how the product answers today → competitive landscape
for that group → gaps affecting it*. This index ties them together.

## 2. User groups (actors) — one file each

Each group has **one core job** (the headline "job to be done" — the progress the group is trying to
make). The job is what the group *hires* the editor for; the per-group file expands it into job stories
and reads the current product against them.

| Actor | File | Who | Core job (JTBD) |
|-------|------|-----|-----------------|
| **Guest / anonymous author** | [`guest.md`](guest.md) · `USR-KEDITOR-001` | Anyone on `editor.kymo.studio`, not signed in (incl. a **recipient** opening a `?s=` share link). | *"Turn text into a clean diagram and get it somewhere useful — right now, no account, no setup."* |
| **Signed-in author** (Google) | [`signed-in.md`](signed-in.md) · `USR-KEDITOR-002` | A returning author who wants their diagrams kept and organised. | *"Keep my diagrams in one place and keep them current as my work changes."* |
| **Agent / LLM host** (MCP) | [`agent-mcp.md`](agent-mcp.md) · `USR-KEDITOR-003` | Claude Desktop / Cursor / claude.ai over `mcp.kymo.studio` (OAuth-gated). | *"Author and update the user's diagrams for them, and have the change show up where they're already looking."* |
| **Operator / embedder** | [`operator.md`](operator.md) · `USR-KEDITOR-004` | Whoever deploys + runs the three artefacts. | *"Run the whole product without operating any servers."* |

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

## 4. Product shape (the funnel)

A clear progression placed on one seam, and it is a **chain of jobs**: *render & share* (guest, J-G*)
→ **Save** → *keep & organise* (signed-in, J-S*) → *automate* (agent, J-A*). Each next job only
appears once the previous one succeeds — which is why **Save** is the single, well-placed funnel:
**Guest (try) → *Save* → Signed-in (keep / organise) → Agent (automate)**. A single account boundary
(`FR-LV-02`) separates "use right now" from "needs an account" — easy to understand, easy to test. The
agent and operator are not stages but *adjacent* clients/roles around the signed-in spine.

## 5. Gaps & opportunities (master list, non-normative)

> Candidates for a future spec/CR — **not** commitments. Each would be raised as a CR under
> `docs/specs/kymo-editor/CR/` if chosen. Per-group files reference these IDs and note the job each puts
> at risk.

| # | Gap | Affected group | Note |
|---|-----|----------------|------|
| G1 | A guest draft is lost on tab-close unless Saved/copied (URL-only). | Guest (`USR-KEDITOR-001`) | e.g. a local "recent drafts" cache for guests. |
| G2 | No collaborative sharing of a **server** document (only `?s=` copies). | Signed-in (`USR-KEDITOR-002`) | the most-requested "keep" expectation. |
| G3 | No durable version history (Trash is a 30-day recovery window). | Signed-in (`USR-KEDITOR-002`) | |
| G4 | No **viewer / comment** role — only author or owner; no read-only share, no presence. | All | |
| G5 | No timed WebSocket auto-reconnect (a drop shows "Offline" until reload). | Signed-in (`USR-KEDITOR-002`) | tracked as R10 in `PLAN-KEDITOR-001`. |

**Test-coverage note (current state).** The **guest** group has the widest surface and the most users,
yet automated E2E covers only the **Welcome** today (`editor-home`, 6 TCs); guest render / share /
export are **manual**-only — the highest-value place to extend automation next.

## 6. Competitive landscape — survey + product table

Surveyed **2026-06-15** by direct browsing. **Observation depth:** *hands-on* (entered the live editor)
for **mermaid.live** and **demo.bpmn.io**; *landing/product-page only* (editor behind login, not signed
in) for **Lucidchart**, **Miro**, **FigJam**. Competitors are external products → cited as plain links.
The **per-group** positioning (who actually competes for each group, where kymo is ahead/behind) lives
in each group file's §4.

| Product | What it is | Observed |
|---------|------------|----------|
| [mermaid.live](https://mermaid.live) | OSS text-DSL diagram editor (paid tier → mermaid.ai) | hands-on |
| [demo.bpmn.io](https://demo.bpmn.io) | bpmn-js **visual** BPMN modeler demo (OSS embeddable toolkit) | hands-on |
| [Lucidchart](https://www.lucidchart.com) | Enterprise **visual** diagramming (AI, data-linking, UML markup, layers) | landing |
| [Miro](https://miro.com) | Infinite-canvas **team collaboration** ("AI Innovation Workspace") | landing |
| [FigJam](https://www.figma.com/figjam/) | Collaborative **whiteboard** for teams | landing |

**Takeaways (one line per group):**
- **Guest** (`USR-KEDITOR-001`): kymo ≈ "mermaid.live + animation + more formats" — and owns the no-account segment with it.
- **Signed-in** (`USR-KEDITOR-002`): crowded, feature-rich; kymo trades collab/AI breadth for openness + dev-fit. Biggest upside = real-time collaboration (**G2**).
- **Agent** (`USR-KEDITOR-003`): kymo's clearest lead — a live MCP channel no incumbent matches.
- **Operator/embedder** (`USR-KEDITOR-004`): competes with OSS mermaid/bpmn-js on openness; differentiates on animation + multi-format + three-language.

---

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-15 | Vũ Anh | Initial product analysis for `editor.kymo.studio`: four user groups, an actor × capability map (current state), per-group analysis, the account-boundary funnel, and a non-normative gap/opportunity list (G1–G5). Derived from the six module specs + a code audit. First doc under the new `docs/products/` (pre-spec, discovery) layer; links to `FEAT-KEDITOR-001` by `document_id`. |
| 0.2     | 2026-06-15 | Vũ Anh | Added competitive landscape (by user group) — mermaid.live, demo.bpmn.io, Lucidchart, Miro, FigJam, surveyed by direct browsing (hands-on for mermaid.live + demo.bpmn.io; landing-only for the login-walled three). |
| 0.3     | 2026-06-16 | Vũ Anh | Added a **jobs-to-be-done (JTBD)** layer, organised by user group: each group's core job + job stories (J-G*/J-S*/J-A*/J-O*), read against the current product; funnel restated as a chain of jobs gated on **Save**. |
| 0.4     | 2026-06-16 | Vũ Anh | **Split each user group into its own file** under the new `USR-KEDITOR-` prefix (`guest.md` `USR-KEDITOR-001` · `signed-in.md` `-002` · `agent-mcp.md` `-003` · `operator.md` `-004`), each self-contained (JTBD → job stories → current state → per-group competitive landscape → gaps). This file is now the **index** (`PRD-KEDITOR-001`): scope, actor overview, capability matrix, funnel, master gap list, and the competitor survey/table only. |
