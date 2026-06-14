---
title: Editor Home — Design
document_id: DESIGN-KHOME-001
version: "0.2"
issue_date: 2026-06-15
status: Implemented
classification: Internal
owner: diagrams/ project
audience: Engineers maintaining the kymo-editor landing / Welcome surface (`packages/editor/web/`); reviewers
review_cycle: On scope change, or via a change-request against the baseline
supersedes: null
related_documents:
  - FEAT-KHOME-001
  - TEST-KHOME-001
  - PLAN-KHOME-001
  - FEAT-KEDITOR-001
  - DESIGN-KEDITOR-001
  - FEAT-KLIBRARY-001
  - FEAT-KLIVE-001
  - FEAT-KRENDER-001
authors:
  - Vũ Anh
language: en
keywords:
  - design
  - kymo-editor
  - editor-home
  - welcome
  - landing
  - react
  - draft-first
  - open-file
---

# Editor Home — Design

| Field             | Value |
|-------------------|-------|
| Document ID       | `DESIGN-KHOME-001` |
| Version           | 0.2 |
| Status            | Implemented |
| Owner             | `diagrams/` project |
| Related Documents | `FEAT-KHOME-001` (the *what*), `TEST-KHOME-001` (V&V), `PLAN-KHOME-001` (delivery), `DESIGN-KEDITOR-001` (the umbrella design — §2 client app structure, ADR-15 draft-first, ADR-16 shell), `FEAT-KLIBRARY-001` / `FEAT-KLIVE-001` / `FEAT-KRENDER-001` (the siblings whose capabilities the Welcome composes) |

> **The *how* for `FEAT-KHOME-001`.** The Welcome home owns **almost no logic** — it is a thin
> presentation surface that **composes sibling capabilities**: the template gallery (`FR-LB-02`),
> the Recent list (the library's `useDiagrams` index), "Open file" into a **draft** (`FR-LV-08`),
> and a docs deep-link. This design covers (a) the `WelcomeView` component and its four blocks,
> (b) the `showWelcome` gate + `welcomeDismissed` lifecycle in `EditorPage`, (c) the header chrome
> while the Welcome shows, and (d) the `openLocalFile` handler. File references are to the shipped
> tree: `packages/editor/web/welcome.tsx`, `packages/editor/web/EditorPage.tsx`. The umbrella
> design (`DESIGN-KEDITOR-001`) carries the surrounding shell (ADR-16) and the draft model (ADR-15)
> this surface sits on.

---

## 1. Scope & architecture

The Welcome home is the **first paint of a fresh `/`**. Architecturally it is a leaf view rendered
*instead of* the editor panes when the buffer is an untouched starter draft. It introduces no data
model, no network calls of its own, and no routes — it reuses `EditorPage`'s state and the library's
`useDiagrams` hook.

```
EditorPage (/)
  ├─ showWelcome ? ─ yes ─► <WelcomeView onNew onOpenFile onTemplate />   (this module)
  │                          ├─ Start     → onNew (template gallery, FR-LB-02) · onOpenFile (FR-HM-02)
  │                          ├─ Recent    → useDiagrams() index → navigate ?d=  | guest sign-in CTA (FR-LV-02)
  │                          ├─ Templates → onTemplate (seeds a draft, FR-LV-08)
  │                          └─ Learn     → docHref("kymo")  (external docs)
  └─ showWelcome ? ─ no ──► source / splitter / preview panes  (editor-render)
```

Dependency: **presentation over `editor-library` (Recent + gallery), `editor-render` (authoring it
hands off to), and `editor-live` (`FR-LV-02` guest boundary, `FR-LV-08` draft)** — see `FEAT-KHOME-001`
§B.3.

## 2. Component structure

| File / symbol | Responsibility |
|---------------|----------------|
| `web/welcome.tsx` → `WelcomeView({ onNew, onOpenFile, onTemplate })` | The view. Reads `claims` (`useAuth`) and the library `items` (`useDiagrams`); computes `recent = [...items].sort((a,b) => (b.updatedAt||0) - (a.updatedAt||0)).slice(0, 8)` and `quick` (the `QUICK` names — Flowchart / Sequence / BPMN / C4 / ER / Class — resolved against `TEMPLATES`). Renders `.welcome > .wel-inner` (the `wordmark.svg` lockup) + a two-column `.wel-cols`. |
| `WelcomeView` → **Start** block | `New diagram…` → `onNew`; `Open file…` → clicks a hidden `<input type=file accept=".kymo,.bpmn,.mmd,.mermaid,.txt,.md">` whose `onChange` calls `onOpenFile(file)` and clears the input. |
| `WelcomeView` → **Recent** block | Signed-out (heading **"No sign-in needed"**): a `.wel-note` value note ("Pick a template and start right away…") with an inline **Sign in** link (`.wel-inline-link`) that calls `google.accounts.id.prompt()` (`FR-LV-02` boundary); the guest column also leads with a `.wel-tagline` + a `.wel-hero` illustration (`welcome-hero.svg`). Signed-in (heading **"Recent"**): up to 8 `recent` rows (kind icon + title + ext) → `navigate("/?d=" + id)`; empty → "No diagrams yet — pick a template to start." **Column order:** guest = [Start, Recent]; signed-in = [Recent, Start] (a returning user resumes first). |
| `WelcomeView` → **Templates** block | `quick.map` → `.wel-tpl` buttons (glyph + name + `via`) → `onTemplate(t)`. |
| `WelcomeView` → **Learn** block | A Documentation link to `docHref("kymo")` (external, `target=_blank rel=noopener`). |
| `EditorPage` → `showWelcome` | `const showWelcome = isDraft && source === SAMPLE && !welcomeDismissed`, where `isDraft = !d && !shared`. Gates the render branch (`booting ? … : showWelcome ? <WelcomeView/> : <panes/>`). |
| `EditorPage` → `welcomeDismissed` (**state**, `useState(false)`) | Set (`setWelcomeDismissed(true)`) by any in-place start action (`pickTemplate`, `openLocalFile`); **reset to `false` on a route change** (`useEffect(… , [d, shared])`) so navigating Back to a fresh `/` restores the Welcome. (State, not a ref — `+ New` keeps the same `SAMPLE` source, so only a re-render hides the panel.) |
| `EditorPage` → `onNew` wiring | `WelcomeView.onNew = () => setGalleryOpen(true)` → opens `<TemplateGallery>` (owned by `editor-library`, `FR-LB-02`). |
| `EditorPage` → `openLocalFile(file)` | `FR-HM-02`. See §3. |

## 3. Open-file → draft (`openLocalFile`, FR-HM-02)

`openLocalFile` reads the file as text, then picks the kind by **content first, extension second**:

```
ext  = file.name extension (lowercased)
byExt = ext==="bpmn" ? "bpmn" : (ext==="mmd"||ext==="mermaid") ? "mermaid" : "kymo"
k     = sniffKind(text) || byExt                     // FR-RD-10 detector, then extension fallback
```

It then arms `welcomeDismissed = true` and `userEdited = true`, clears the title, sets `kind`/`source`,
and `history.replaceState(null, "", "/")` — so the local source becomes the live **draft** (URL-only,
no server document until Save — `FR-LV-08`). The same `sniffKind` powers paste auto-detect in
`editor-render` (`FR-RD-10`), reused here rather than re-implemented.

## 4. Header chrome while the Welcome shows

`EditorPage` renders a reduced header for the Welcome state:

- **Brand:** signed-out → an external link to `https://kymo.studio`; signed-in → an internal `/` Home link.
- **Title:** none — `titleEl` is `null` on the Welcome (a redundant "Welcome" label was removed from the header; the panel below is self-evident).
- **Actions:** the Export / Share controls and the pane-toggle group are wrapped in `{!showWelcome && …}`,
  so they are **hidden** on the Welcome; a guest sees the `<GoogleButton/>`.
- **Activity bar / Explorer:** shown only when `claims && !shared` (the signed-in shell, `FR-LB-06`); a guest
  Welcome has no rail.

**Known gap (R-HM1):** the `document.title` effect derives the tab title from `diagramLabel` (the
`SAMPLE`-derived name, e.g. "Receive order"), so the browser tab reads the sample title while the screen
reads "Welcome". A one-line fix (`document.title = "Welcome · Kymostudio"` when `showWelcome`) is tracked
as a code follow-up in `PLAN-KHOME-001` §5.

## Annex A — Key decisions & ADR

- **ADR-HM-1 — The `/` landing is a Welcome home, not a redirect.** The umbrella's `FR-KE-21` originally
  specified that `/` (signed-in) **redirect** to the most-recently-updated diagram. The shipped product
  instead presents a VS Code-style **Welcome** for both guests and signed-in users; the "land somewhere
  useful" intent is preserved by the **Recent** column (which surfaces the most-recent diagrams). Rationale:
  orientation beats a silent jump, and a guest gets a clear place to sign in. The redirect clause is
  **superseded** (annotated in `FEAT-KEDITOR-001` §C.6; owned here as `FR-HM-01`). Trade-off: one extra
  surface to maintain.
- **ADR-HM-2 — `showWelcome` is a derived gate, not a route.** The Welcome has no URL of its own; it is
  `isDraft && source === SAMPLE && !welcomeDismissed`. In-place start actions arm `welcomeDismissed` (reveal
  the editor without a navigation), while a route change to `?d`/`?s` resets it (a `?s=` link bypasses the
  Welcome entirely; Back to a fresh `/` restores it). Rationale: keeps the draft-first model (ADR-15) intact
  — the Welcome is a *state*, not a page. Trade-off: the gate couples to the `SAMPLE` sentinel and an
  in-memory `useState` flag rather than URL state.
- **ADR-HM-3 — Guest sign-in is contextual, in Recent.** There is no One-Tap auto-prompt on the Welcome
  (a visitor hasn't asked to sign in); the CTA sits in the **Recent** column, where the payoff ("see your
  diagrams") is. This realises the `FR-LV-02` boundary (signed-out is fully usable) and matches `auth.tsx`'s
  "prompts fire contextually" stance.
- **ADR-HM-4 — Compose, don't own.** The Welcome **invokes** sibling capabilities and owns only their
  presentation: New → the `editor-library` template gallery (`FR-LB-02`); Recent → the library `useDiagrams`
  index; Open file → an `editor-live` draft (`FR-LV-08`); Learn → `docHref`. No data, render, or account
  logic lives here. Rationale: the landing surface should stay thin so each capability has a single owner.

## Annex B — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-15 | Vũ Anh | Initial design for the Welcome home, carved out of `DESIGN-KEDITOR-001` §2 as `editor-home` grew its own doc-set. Documents `WelcomeView` + its four blocks, the `showWelcome`/`welcomeDismissed` gate, the reduced header chrome, and `openLocalFile`. ADR-HM-1..4 (Welcome-not-redirect; derived gate; contextual guest sign-in; compose-don't-own). Records the `document.title` gap (R-HM1). |
| 0.2     | 2026-06-15 | Vũ Anh | Reconcile §2 / §4 / ADR-HM-2 to the merged `welcome.tsx`: guest Recent = **"No sign-in needed"** note + inline Sign in (+ tagline / hero), column order, `welcomeDismissed` is React **state** (not a ref), and **no "Welcome" header title** (`titleEl` is `null`). Noted the `data-testid` selectors added to `welcome.tsx` for the E2E smoke suite. |
