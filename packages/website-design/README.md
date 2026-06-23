# website-design — design.kymo.studio

The **kymo brand & design system** as a single page: the mark, the Mermaid
colour palette, typography, design tokens and brand voice — with the logo and
wordmark lockups downloadable, and click-to-copy hex/token values.

A small **React app** (esbuild → `dist/bundle.js`), matching the other kymo
sites (`packages/website`, `packages/website-icons`). The page **dogfoods** the
kymo design tokens (same `:root` as the landing site), so the surface _is_ the
spec. `styles.css` stays a plain copied stylesheet (not imported into TSX).

```bash
./build.sh        # bundle src/main.tsx + assemble dist/ from src/ + docs/brand
npm run dev       # serve dist/ at http://localhost:4500
npm run typecheck # tsc --noEmit
```

- **Source of truth.** The brand assets and the brand-language table are
  canonical in `docs/brand/` (`README.md`, `logo.svg`, `wordmark{,-dark}.svg`,
  favicons). `build.sh` copies them in — never fork them here. When `docs/brand`
  changes, the content here may need a matching edit.
- **Tokens** mirror `packages/website/src/styles.css`. Keep them in lockstep.

**Deploy.** Cloudflare Pages project `kymo-design` (served at
`https://design.kymo.studio`). Pushing to `main` under `packages/website-design/**`
or `docs/brand/**` auto-deploys via `.github/workflows/deploy-website-design.yml`.
Manual path:

```bash
npx wrangler pages deploy dist --project-name=kymo-design --branch=main
```
