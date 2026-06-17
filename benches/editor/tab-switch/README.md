# editor / tab-switch — re-render & re-fetch on tab switch

Probes one question on the **deployed** editor: when you switch BACK to an
already-open tab, does the app reuse what it rendered, or redo the work? Today it
redoes it — and for **kroki kinds** that means a fresh `POST render.kymo.studio`
on every switch (the in-browser kymo/mermaid paths just re-run locally). This
bench quantifies that and is the regression/­improvement probe for a per-tab
render cache (which should drive the warm `render_reqs` to 0).

Per target diagram, two phases:

- **cold** — first open (from the Explorer).
- **warm** — switch back to it after visiting the others.

Two metrics, median over `--reps` sessions:

- **`render_ms`** — the editor's own self-timed render (the `.status` tooltip
  `· N ms`).
- **`render_reqs`** — `POST`s to `render.kymo.studio` during that switch, counted
  over a fixed settle window. For a kroki kind this is the **cache-miss signal**:
  `1` = re-fetched on switch, `0` = reused. (in-browser kinds always log `0`.)

A representative snapshot (`p=63b6cc41`, reps=3):

| diagram | kind | phase | render_ms | render_reqs |
|---|---|---|---|---|
| C4 System Context | c4plantuml | cold | 257 | 1 |
| C4 System Context | c4plantuml | **warm** | 188 | **1** |
| MCP live-sync sequence | mermaid | cold | 213 | 0 |
| MCP live-sync sequence | mermaid | warm | 33 | 0 |
| React OK | kymo | cold/warm | 1 | 0 |

→ `c4plantuml` **warm `render_reqs = 1`**: switching back re-fetches the render
every time. A per-tab `(kind+source) → svg` cache should make it `0`.

## ONLINE + AUTHENTICATED

Unlike the sibling share-link bench, the tab strip only exists for a **signed-in
owner**, so this drives the real editor logged in via a Playwright
**`storageState`** captured from a browser already signed in with Google.

`.auth/state.json` holds a **real, ~1h Google `id_token`** — it is a credential:
**gitignored, never committed**, and it expires, so re-capture before a run.
This is the research-backed pattern (don't automate the Google login UI; reuse a
captured authenticated state). For CI, mint an `id_token` from a stored refresh
token instead (OAuth 2.0 Playground), or bench the *public* `render.kymo.studio`
cost directly with k6 (no auth needed).

### Capture the auth state

From a browser already signed in to `editor.kymo.studio`, read `localStorage`
and write a Playwright storageState to `.auth/state.json`:

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
cd benches/editor/tab-switch
uv sync                       # playwright (pip); uses your installed Google Chrome
uv run python bench.py        # → results/perf.json + a printed table
# Options: --reps N · --channel '' (bundled chromium — needs `uv run playwright install chromium`)
```

## Files

| File | Role |
|---|---|
| `bench.py` | the harness: load signed-in (storageState) → open each target → switch back → medians |
| `.auth/state.json` | captured login (gitignored — real id_token) |
| `results/perf.json` | latest run snapshot (gitignored) |
