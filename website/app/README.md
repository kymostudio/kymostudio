# kymo playground

A fully client-side editor — write a `.kymo` DSL (or paste a BPMN 2.0
`.bpmn` file) and get an SVG live in the browser. No server, no Python: it
bundles the dependency-free [`kymostudio`](../../packages/js) JS package and
runs `parseDiagram` / `parseBpmn` + `renderSVG` entirely in-page.

Deployed as a static subfolder of `website/`, so the existing
`.github/workflows/deploy-website.yml` ships it automatically on push to `main`.

## Files

| File | Role |
|------|------|
| `index.html` | Page shell + styles (two panes: editor / live preview) |
| `app.js` | Source: render loop, format detection, `?script=` share links |
| `kymo.bundle.js` | **Built artifact** — esbuild output, committed for Pages |
| `build.sh` | Regenerates `kymo.bundle.js` |

## Develop / rebuild

`app.js`, the `kymostudio` package, the icon manifest, and the starter samples
are inlined into `kymo.bundle.js`. After editing any of them, rebuild:

```bash
./build.sh        # recompiles packages/js, then re-bundles
```

Then preview locally (serve `website/` so `/app/` resolves):

```bash
cd ..             # into website/
python3 -m http.server 8000
# open http://localhost:8000/app/
```

## Sharing

The editor source is deflate-compressed and base64url-encoded into the
`?script=` query parameter (the same idea as play.d2lang.com). **Copy link**
writes the current URL to the clipboard; opening it restores the diagram.

## Icons

Built-in vector icons render with no network. The ~2300 file-backed icons
(cloud-provider logos) are fetched lazily from jsDelivr
(`cdn.jsdelivr.net/gh/kymostudio/kymostudio@main`) via `setIconBaseURL`.
