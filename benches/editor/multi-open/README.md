# editor / multi-open — what opening N files "at once" costs

The sibling [`tab-switch`](../tab-switch/) bench measures **one** open/switch. This
one measures the burst you feel when you open a handful of files back-to-back, and
the cold load when a project **restores** that many open tabs. Default **N = 5**.

Two phases, both signed-in on the **deployed** editor:

- **burst** — from an empty tab strip, open the first N Explorer files
  back-to-back (one click per file). The active (last-opened) diagram is the one
  that renders; the rest sit as tabs.
- **restore** — reload the project with those N tabs persisted (localStorage + the
  `/api/tabs` backend). This is the literal "N files open at once" cold load.

Three metrics per phase, median over `--reps` sessions:

| metric | meaning |
|---|---|
| `tabs_ms`  | first click (burst) / navigation (restore) → **all N tab chips** present in the strip. |
| `image_ms` | → the **active** diagram first paints (first preview SVG). |
| `ready_ms` | → the active diagram is fully **settled**, including its entry animation (for animated kymo SVGs `ready_ms > image_ms`; for static kroki/mermaid `≈ image_ms`). |

`burst` also records a `cascade` (`[{n, t}]` — when each chip appeared, ms from the
first click) so you can watch the strip fill up.

A representative snapshot (`p=63b6cc41`, 5 files, reps=3, medians):

| phase | files | tabs_ms | image_ms | ready_ms |
|---|---|---|---|---|
| burst   | 5 | ~540 | ~540 | ~540 |
| restore | 5 | ~845 | ~845 | ~845 |

→ The three columns collapse on purpose: during a burst `renderSeq` cancels every
in-flight render, so **only the active (last-opened) file ever paints** — and it
does so right as the strip finishes filling. These five are static kinds (no
animation), so `ready_ms ≈ image_ms`. Takeaway: opening 5 files costs roughly one
render (~½ s), not five; a cold **restore** of the same 5 tabs is ~0.85 s.

### Why clicks must land in separate ticks

The editor's `openDiagram` folds the new id into the open-tab list off a
**render-time closure** (`[...openTabs, id]`, not a functional update). Firing all
N clicks in **one** synchronous tick makes each see the same stale list and clobber
to a single tab — so the bench issues one click per file, each its own CDP
round-trip (= its own event-loop turn, with a React commit between). That is also
what a real user does; nobody opens five files in one 16 ms frame.

## ONLINE + AUTHENTICATED

The tab strip only exists for a **signed-in owner**, so this drives the real editor
logged in via a Playwright **`storageState`** (`.auth/state.json`).

`.auth/state.json` holds a **real, ~1h Google `id_token`** — it is a credential:
**gitignored, never committed**, and it expires, so re-capture before a run. (Same
setup as the `tab-switch` bench — you can reuse the same capture.)

### Capture the auth state

From a browser already signed in to `editor.kymo.studio`, read `localStorage` and
write a Playwright storageState to `.auth/state.json`:

```json
{ "cookies": [], "origins": [ {
  "origin": "https://editor.kymo.studio",
  "localStorage": [ { "name": "kymo_idtoken", "value": "<the id_token>" } ]
} ] }
```

(`kymo_idtoken` is the only entry that matters; the editor auth is
localStorage-based, no cookies.)

## Run

```bash
cd benches/editor/multi-open
uv sync                       # playwright (pip); uses your installed Google Chrome
uv run python bench.py        # → results/perf.json + a printed table
# Options: --files N (default 5) · --reps N · --channel '' (bundled chromium — needs `uv run playwright install chromium`)
```

The project (`63b6cc41`) needs at least N files; if it has fewer, the bench opens
what's there and reports the actual count.

## Files

| File | Role |
|---|---|
| `bench.py` | the harness: load signed-in → empty strip → burst-open N → reload → restore; medians |
| `.auth/state.json` | captured login (gitignored — real id_token) |
| `results/perf.json` | latest run snapshot (gitignored) |
