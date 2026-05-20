# kymostudio (JavaScript)

A browser/Node port of the shared **data model + icon library** for
[kymo](../python) — the diagram-as-code DSL. The DSL parser, layout engine
and SVG renderer remain Python-only (see [`../python`](../python)); this
package ships the shared model and icons.

## Install

```bash
npm install kymostudio
```

```js
import { makeComponent, makeEdge, anchor, ICONS, getIcon } from "kymostudio";
```

`getIcon(key)` resolves built-in glyphs synchronously; file-backed icons are
fetched lazily from the manifest. Configure the asset host with
`setIconBaseURL(url)` before the first lookup.

## Scripts

```bash
npm run build-manifest   # scan ../../icons and (re)write icons-manifest.json
npm test                 # node --test tests/
```

The icon set itself lives at the repo root in [`../../icons/`](../../icons/),
shared with the Python package. `icons-manifest.json` is generated from it and
bundled into the published npm package.

## License

Apache License 2.0 — see [`LICENSE`](./LICENSE).
