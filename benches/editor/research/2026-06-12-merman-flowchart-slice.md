# Round 5: a Rust mermaid after all — one grammar, linker-sliced from merman

*An offline study behind `benches/editor/`. Written 2026-06-12 — the round
behind PR #315 (`packages/rust/kymo-mermaid`), following
[round 4](2026-06-12-mermaid-client-side.md). The committed
[`../results/REPORT.md`](../results/REPORT.md) is this round's snapshot.*

## Abstract

Round 4 closed with mermaid rendering in-browser via mermaid.js and an open
question: should the engine be Rust? The day's earlier analysis said a full
port was a treadmill — mermaid has no spec, ~20 grammars, and the one serious
Rust port ([merman](https://github.com/Latias94/merman), 3,472 commits,
3,500+ upstream SVG baselines) ships a 9.8 MB wasm precisely *because* it
won that parity. The resolution came from asking a narrower question: **what
does the linker keep if we only call one grammar?** merman's flowchart
pipeline is fully `pub`; calling `parse_flowchart → layout_flowchart_v2 →
render_flowchart_v2_svg` directly — never touching the Engine whose registry
tables anchor every parser — leaves 22 grammars unreachable, and LTO deletes
them: **9.8 MB → 1.5 MB raw, ~473 KB brotli**, 38 % under mermaid.js, with
mermaid-11-parity output. Flowchart (the dominant grammar, LLM output above
all) now renders through this slice; everything else — and any slice error —
falls back to mermaid.js. Pinned by git rev, ~100 lines of wrapper, zero
vendored code.

## 1. The size ladder

Measured on the cloud box, wasm32 + opt-z + fat LTO, brotli -q 6:

| build | raw | brotli | what anchors the weight |
|---|---|---|---|
| merman-wasm (upstream, full) | 9.8 MB | ~3.6 MB | everything, plus bindings |
| Engine dispatch + LTO | 4.0 MB | 1.36 MB | registry function-pointer tables reference all 23 parsers |
| direct flowchart call | 2.1 MB | 733 KB | front-matter config (YAML/json5) + lol_html sanitizer |
| **+ `default-features = false`** | **1.5 MB** | **~473 KB** | flowchart parser + dugong (dagre port) + SVG emitter |

Two structural facts made the slice possible, and neither was luck. merman
measures text with **vendored font metrics tables, not embedded fonts** — the
"browser tax" this bench's round 3 wrote about is something merman also
refuses to pay. And every grammar module is `pub`, so slicing needs no fork:
the crate (`kymo-mermaid`) is a rev-pinned git dependency plus a wrapper the
length of this paragraph.

The `default-features` cut is honest, not sneaky: front-matter config and
HTML sanitization are the two merman services the editor already gets
elsewhere (sources with `---` front-matter or `%%{init}%%` route to
mermaid.js; all SVG passes DOMPurify client-side regardless of origin).

## 2. What the editor does with it

`web/mermaid.ts` now picks per source: a plain `flowchart`/`graph` header →
the wasm slice; anything else — other grammars, directives, front-matter, or
**any slice error** → mermaid.js, unchanged. Degradation is to the slower
chunk, never to a broken diagram. The 900 ms share-link warm-up race is
untouched: an edge-cache hit still downloads no local engine at all.

The slice also closes the fidelity gap that killed the "extend the in-house
parser" plan: the whole probe set the kymo parser failed (`A -- text --> B`,
`classDef`/`class`/`:::`, `A & B --> C`, `style`/`linkStyle`, `(((…)))`)
renders correctly, as native unit tests now assert. One probe failure is
*correct*: unaccented-unquoted unicode node *ids* fail in mermaid.js too —
parity includes the warts.

## 3. Results

| | round 4 | round 5 |
|---|---|---|
| mermaid-fresh DIAGRAM_VISIBLE_MS | 3,239 🟡 | **2,891 🟡** |
| mermaid-fresh WIRE_TOTAL_KB | 1,042 🟡 | **717 🟡** |
| mermaid-share DIAGRAM_VISIBLE_MS | 1,492 🟢 | 1,316 🟢 |
| kymo-default DIAGRAM_VISIBLE_MS | 3,438 🟡 (bad network) | **1,587 🟢** |
| quality (labels via the slice, prod) | — | ✅ all |

The fresh path sheds ~330 KB of wire and ~350 ms but keeps both 🟡 — and the
decomposition says why: FCP ~880 + **the 900 ms race window** + ~450 ms wasm
fetch + render. The race window is now the single largest controllable term
on the fresh path. Round 4 flagged it; round 5 makes it the headline of the
next one: a smarter scheme (start fetching the slice *during* the race, or
shrink the window when `navigator.connection` looks fast) trades hit-case
bytes for miss-case latency and needs measuring, not believing.

## 4. The strategic note

The day now contains both answers to "Rust mermaid?": **no** to porting (the
treadmill is real — merman needed 3,472 commits to run on it so kymostudio
doesn't have to), **yes** to consuming a port *surgically*, at the grammar
granularity, behind a fallback. If merman's parity holds up in production,
the same slicing recipe extends one grammar at a time — sequence is the
obvious next — with mermaid.js shrinking from renderer to safety net. The
exit criteria stay wire-graded: each new slice ships only if its brotli
number beats the bundle it displaces.
