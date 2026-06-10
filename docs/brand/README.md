# kymo — brand assets

Logo and colour reference for **kymo**. The mark is a **K** built from connected
strokes with diagram-style node handles, on a rounded tile, using the **Mermaid**
colour palette.

## Files

| File | Use |
| --- | --- |
| `logo.svg` | **Master.** Pink tile + white **K**. Self-contained, resolution-independent (pure vectors — no font, no raster). |
| `favicon.svg` | **Favicon source** — a **font K** (SF Pro Rounded Black, outlined, no node dots). Everything below is generated from it. |
| `favicon.ico` | Legacy favicon, **48 + 32 px** (no 16 — see note). |
| `favicon-32.png`, `favicon-48.png` | PNG favicons. |
| `apple-touch-icon.png` | iOS / `apple-touch-icon` (180×180, rendered from the full master). |
| `social-preview.svg` | **Social-preview banner source** (1280×640 viewBox) — GitHub og-image, horizontal lockup: tile + two-tone wordmark + tagline "Diagram superpowers". |
| `social-preview.png` | Rendered banner (2560×1280, 2×). The committed render is canonical — see font caveat below. |
| `github-hero-dark.svg` / `-light.svg` | **README hero source** (1000×280 viewBox, transparent bg) — tile + two-tone wordmark + tagline; dark = white primary, light = navy primary. |
| `github-hero-dark.png` / `-light.png` | Rendered heroes (2000×560, 2×) used by the root README's `<picture>` (dark/light via `prefers-color-scheme`). Same font caveat as the banner. |

**Favicon ≠ a shrunk master.** The master's node-dot handles turn to mush at
small sizes, so the favicon (`favicon.svg`) is a separate glyph: the same pink
tile and white **K**, but a **plain letterform — SF Pro Rounded Black, outlined to
a path, no node dots**. Use the full `logo.svg` (with dots) everywhere ≥ 64 px.

**No 16 px.** Targets are the 32 px retina tab and the 48 px multiple Google
Search wants; the bitmaps are rendered at 32 / 48 and `.ico` bundles those two.
On a 1× display the browser scales 32→16 (slightly soft, rarely seen); add a
16 px entry only if pixel-sharp 1× tabs matter.

Regenerate the favicon set (all from `favicon.svg`):

```bash
cd docs/brand
# Render each size DIRECTLY from the vector (analytic anti-alias) — never downscale
# a raster, that's where edge quality is lost.
rsvg-convert -w 48 -h 48 favicon.svg -o favicon-48.png
rsvg-convert -w 32 -h 32 favicon.svg -o favicon-32.png
# Pack both frames losslessly: keep transparency, force consistent 8-bit RGBA,
# strip metadata. (-type/-depth guard against surprise quantization; -strip trims.)
magick favicon-48.png favicon-32.png \
  -background none -type TrueColorAlpha -depth 8 -strip favicon.ico
rsvg-convert -w 180 -h 180 logo.svg -o apple-touch-icon.png   # apple-touch from the master
```

Regenerate the social-preview banner (after a tagline/layout change):

```bash
cd docs/brand
rsvg-convert -w 2560 -h 1280 social-preview.svg -o social-preview.png
rsvg-convert -w 2000 -h 560 github-hero-dark.svg -o github-hero-dark.png
rsvg-convert -w 2000 -h 560 github-hero-light.svg -o github-hero-light.png
```

**Banner font caveat.** Unlike the master logo (pure geometry), the banner's
wordmark + tagline are `<text>` set in **SF Pro Rounded** (Black 900 / Medium
500) — the same face as `favicon.svg`'s glyph, but *not* outlined. Rendering
therefore requires SF Pro Rounded installed (macOS with Apple's SF fonts);
elsewhere the text falls back to whatever fontconfig picks. The committed
`social-preview.png` is the canonical render — re-render only on a machine with
the font. Upload it at repo **Settings → Social preview** (no API; web UI only).

**ICO quality notes** — what makes this lossless / maximum-quality:

- *Per-size vector render.* Each frame is rasterised straight from `favicon.svg`
  at its target size, so the only resampling is the rasteriser's own analytic AA —
  no raster→raster downscale, no double blur.
- *No colour loss.* A 48 px render has ~140 distinct colours (< 256), so even
  ImageMagick's paletted ICO storage is bit-exact; `-type TrueColorAlpha` keeps it
  explicit. The pink→white edge gradient is preserved with no banding.
- *Full 8-bit alpha.* The rounded-tile corners keep an 8-bit alpha channel (not a
  1-bit mask), so corners stay smooth on any tab background.
- *Stripped.* No colour profiles / metadata chunks bloating the file.

Wire it into a page `<head>`:

```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48.png">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png">
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="apple-touch-icon" href="/apple-touch-icon.png">
```

## Construction

- The **K** is drawn as three round-capped strokes — stem, upper arm, lower leg
  (`stroke-width 11.5`) — i.e. the letter as a tiny node-and-edge graph, echoing
  what kymo renders.
- Each stroke endpoint / junction carries a **node handle**: a white ring with a
  pink core (`circle` r5.8 over r2.44 `#e0095f`) — the connector dots of a diagram
  editor. Six in total.
- No text element and no font dependency: the glyph is geometry, so it renders
  identically everywhere.

## Colours (Mermaid palette)

| Token | Hex | Role |
| --- | --- | --- |
| Pink / crimson | `#E0095F` | Primary. Tile background, node cores. |
| Navy | `#242131` | Dark surface (for an inverse tile, if needed). |
| White | `#FFFFFF` | The **K** strokes and node rings. |
| Teal (light) | `#DDECEE` | Secondary accent (Mermaid `--accent`), optional. |

Sourced from Mermaid (`mermaid.ai`): signature pink `#E0095F`, dark `#242131`,
pale-teal accent.

### Contrast — approved pairings (WCAG)

| Pairing | Ratio | Verdict |
| --- | --- | --- |
| White on pink `#E0095F` | **4.8 : 1** | ✅ AA text — **master** |
| Pink `#E0095F` on navy `#242131` | 3.3 : 1 | ✅ AA large / UI icon — inverse |

**Avoid:** white on the old NVIDIA green `#76B900` = **2.4 : 1** (fails even the
3.0 UI threshold). That is why the mark moved off green+white. If a green tile is
ever needed, pair it with a **dark** glyph (`#0A0A0F`, ≈ 8.2 : 1), not white.

## Don'ts

- Don't set the white **K** on a bright / high-luminance background (see contrast table).
- Don't add a `<text>` element — keep the glyph as strokes so there's no font dependency.
- Don't stretch the tile; keep the `rx` corner radius proportional (18 on a 100 side ≈ 18%).
