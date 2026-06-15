# iconpacks/

Iconify-format icon packs registered with the **mermaid.js reference** renderer
(`mmdc`) in `worst10-grid.mjs`, so the ground-truth PNGs draw real glyphs instead
of `?` placeholders. Mermaid's docs register these via `registerIconPacks`; the
CLI equivalent is `--iconPacks` (npm packs from unpkg) / `--iconPacksNamesAndUrls`
(`prefix#url`).

## `aws.json`

The `aws:arch-amazon-*` icons used by `flowchart-icon_004` (from mermaid's own
cypress spec *"render aws icons with labels and rect elements"*, issue #7185)
have **no public Iconify pack** — they are AWS's proprietary set. Mermaid's
cypress harness ships a deliberately **simplified** `aws` pack (three flat colour
boxes) in `cypress/platform/viewer.js`; this file mirrors those three icons
**verbatim** so our reference render matches mermaid's own test output exactly.

Source: `mermaid-js/mermaid` `cypress/platform/viewer.js` (`prefix: 'aws'` block).

`fa:` glyphs (`flowchart-icon_001`) come from the public `@iconify-json/fa`
packs, downloaded from unpkg on demand — no local copy needed.
