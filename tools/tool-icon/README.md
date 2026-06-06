# tool-icon

A small **web app** for picking vendor-neutral **agentic-AI concept icons**
from [Iconify](https://iconify.design), to vendor into the kymo `ai` icon set
(`packages/icons/sets/ai.json`). It's served by a **zero-dependency Node static
server** — open it in a browser and use DevTools to debug.

The `ai` set currently ships 3 brand logos (`ai:openai`, `ai:anthropic`,
`ai:gemini`). It lacks concept glyphs, so `samples/aiq.kymo` has to reuse one
`hex-agent` for 8 different agent roles. This tool helps choose 10 concept icons
(`ai:agent`, `ai:orchestrator`, `ai:llm`, `ai:tool`, `ai:memory`,
`ai:retriever`, `ai:vector-db`, `ai:guardrail`, `ai:human-in-the-loop`,
`ai:mcp`) by browsing Iconify candidates visually.

## Run

```bash
cd tools/tool-icon
npm start                 # node server.js  → http://localhost:5173
# or: PORT=8080 node server.js
```

No install step — pure Node stdlib. Open the printed URL in a browser. Needs
network access to `api.iconify.design` (search + icon data) and
`code.iconify.design` (the `iconify-icon` web component).

## Use

1. Pick a concept on the left. The first keyword is searched automatically;
   click the keyword chips or type your own query.
2. Click a candidate in the grid to assign it to the current concept.
   Toggle **Nền tối** to preview `currentColor` recolour on a dark background.
3. Mark **Hợp lý** and add a note if useful.
4. **Lưu lựa chọn** writes `selections.json`.

## Output → `ai` set

`selections.json` (git-ignored) maps each concept address to the chosen Iconify
icon:

```json
{
  "ai:agent":        { "iconify": "mdi:robot-outline", "ok": true, "note": "" },
  "ai:orchestrator": { "iconify": "tabler:sitemap",    "ok": true, "note": "" }
}
```

Next step (outside this app): for each chosen `iconify` address, vendor it into
`packages/icons/sets/ai.json` under `category: "concept"` with key = concept
(`agent`, `orchestrator`, …) — run it through the normalize pipeline so the body
uses `currentColor` (e.g. `kymo icons download --from iconify <addr>`), bump
`info.total`/`info.categories`, then `node packages/icons/scripts/build-manifest.mjs`.
Prefer CC0/MIT collections (lucide, tabler, mdi) to keep licensing simple.

## Layout

```
server.js          zero-dep Node static server + GET/POST /api/selections
concepts.json      the 10 concepts + search keyword seeds (edit freely)
renderer/          index.html · app.js (Iconify search + selection) · styles.css
```
