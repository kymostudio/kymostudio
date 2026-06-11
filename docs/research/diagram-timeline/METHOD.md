# Ranking Method — Weighted Criteria behind the Top-10s

| Field       | Value                                            |
|-------------|--------------------------------------------------|
| Document ID | RES-DIAGRAM-TIMELINE-002                         |
| Version     | 1.0                                              |
| Issue Date  | 2026-06-11                                        |
| Status      | Draft                                            |
| Related     | `RES-DIAGRAM-TIMELINE-001` ([Index](README.md)) · `docs/data/database.sqlite` · `docs/data/compute_rankings.py` |

This page defines **how the per-year top-10 rankings are computed**. The rankings are not bare editorial ordinals: each entry carries per-criterion scores (0–10) and the rank is the descending order of a **weighted composite**. The weights, scores, and the canonical ranking function all live in `docs/data/`; this page is the normative description.

## 1. Criteria and weights

Weights sum to 1 per category and live in the `criteria` table.

### Tools (`tool_rankings`)

| Criterion | Weight | What it measures |
|---|---|---|
| Adoption | 0.35 | Installed base / active users relative to the field that year |
| Ecosystem | 0.20 | Integrations, marketplace and platform reach |
| Momentum | 0.20 | Trajectory vs the prior year: growth, funding, releases |
| Mindshare | 0.15 | Press, community and survey presence |
| Longevity | 0.10 | Sustained presence across the timeline |

### Diagram types (`diagram_rankings`)

| Criterion | Weight | What it measures |
|---|---|---|
| Prevalence | 0.40 | How widely the diagram type is drawn that year |
| Tooling | 0.25 | Template and tool support across major tools |
| Persistence | 0.20 | Sustained presence across the timeline |
| Momentum | 0.15 | Trajectory vs the prior year |

## 2. The ranking function

Implemented canonically in [`docs/data/compute_rankings.py`](../../data/compute_rankings.py):

```
composite(entry) = Σ_criterion  weight(criterion) × score(entry, criterion)
```

- Per-criterion scores are 0–10 (`diagram_scores` / `tool_scores`), so the composite is also 0–10.
- A year's ranking is the **descending order of the composite**.
- **Tie-break**: previous-year rank ascending (an incumbent keeps its place over a challenger with the same composite), entries absent the previous year last, then key alphabetically.
- The composite is stored on the ranking rows (`score` column) so the pages and the DB stay consistent.

Run modes (inside the `docs/data` uv project):

```bash
uv run compute_rankings.py            # --check: stored ranks/scores match the function
uv run compute_rankings.py --apply    # rewrite rank + score from the scores tables
```

`--check` is the invariant to keep green; after editing weights or scores, run `--apply` and then `render_tables.py` to refresh the 31 pages.

## 3. How the scores were seeded

No per-year market-share survey of diagramming exists, so the per-criterion scores are **estimates, not measurements**. They were seeded from transparent heuristics over the researched evidence base (`RES-DIAGRAM-TIMELINE-001`):

- **Adoption / Prevalence** — anchored to the researched position (rank 1 ≈ 10 … rank 10 ≈ 1), the criterion most directly supported by the cited evidence (press, filings, funding, user counts).
- **Longevity / Persistence** — years the entry has appeared on the list so far, capped at 10.
- **Momentum** — mapped from the year-over-year movement: `new` → 8, `back` (re-entry) → 7, `↑k` → 6+k (cap 10), `=` → 5, `↓k` → 5−k (floor 1). The 1995 baseline uses position.
- **Ecosystem / Tooling** — mean of position and longevity.
- **Mindshare** (tools only) — mean of position and momentum.

Finally, a **calibration pass** minimally adjusts scores (highest-weight criterion first, cascading by weight) so adjacent composites differ by ≥ 0.02 in the researched order. The researched ordering is the ground truth from `RES-DIAGRAM-TIMELINE-001`; the scores *decompose* it into auditable criteria rather than re-derive it. Editing a score and re-running `--apply` **can** legitimately change ranks — from then on the function, not the seed, is authoritative.

## 4. Verifiable anchors — the metrics tables

Alongside the estimated scores, the database carries a layer of **directly verifiable data points**: `tool_metrics(key → tools, metric, value, unit, as_of, source, note)` for point-in-time facts, plus per-year series in `tool_metric_history` and `diagram_metric_history`. Every row has a date and a citable source; nothing in them is estimated. `tool_metrics` contents (33 rows):

| Metric | What it is | Verification |
|---|---|---|
| `github_stars` (12 tools) | Star counts for the OSS tools (Mermaid 88.6k, Excalidraw 125.1k, tldraw 47.7k, D2 24.3k, mingrammer 42.3k, …) | Fetched live from the GitHub API on 2026-06-11; re-fetch the `source` URL to verify |
| `npm_weekly_downloads` (5 libs) | Weekly npm downloads (mermaid ≈ 8.53M/wk, bpmn-js ≈ 261k/wk, …) | npm registry API, 2026-06-11 |
| `claimed_users` (7 rows) | Officially announced user counts (Miro 2M → 90M arc 2018–2025, Lucid 100M+, Visio 12M+) | Company announcements / press, each with URL and date |
| `funding_round`, `valuation`, `arr` | Business milestones (Miro $17.5B, Mural $2B, tldraw $10M A, Mermaid Chart $7.5M seed, Lucid $100M ARR) | Press coverage with URL and date |
| `weekly_active_users`, `claimed_installs_per_year`, `award` | Misc dated claims (Excalidraw 20k WAU 2021, SmartDraw >2M installs/yr 2008, Mermaid JS Open Source Award 2019) | Source URL per row |

**Tool series live in `tool_metric_history(key → tools, metric, year, value, unit, source, note)`** — per-year measurements, also fully verifiable:

- `github_stars_gained` (89 rows, 10 OSS tools): stars gained **per year**, counted from GH Archive `WatchEvent`s queried via the public ClickHouse playground (`play.clickhouse.com`, `github_events` dataset). Repo renames are folded in (e.g. `knsv/mermaid` + `mermaid-js/mermaid`). The series confirm the researched narrative independently: Mermaid's 2014 launch spike (5,043 stars) and 2022 GitHub-integration spike (13,185), Excalidraw's 14k first-year stars in 2020.
- `npm_downloads` (35 rows, 5 libraries, 2015–2025): downloads **per year** from the npm registry range API (data exists from 2015-01-10). Mermaid's arc — 6.4k (2015) → 2.0M (2019) → 10.6M (2022) → 74.7M (2025) — is the cleanest measured adoption curve in the whole database.

**Diagram-type series live in `diagram_metric_history(key → diagrams, metric, year, value, unit, source, note)`** (519 rows) — three sources, deliberately chosen so their windows tile the 30 years:

- `books_ngram_freq` (250 rows, 10 types, **1995–2019**): term frequency in the Google Books corpus (en-2019, smoothing 0), stored per 10⁹ words. The only measurable signal covering the desktop era. It independently reproduces the era narrative — "UML" runs 156 (1995) → 3,378 at the 2005 peak → 1,691 (2010) → ~660 (2019), the rise-and-fall of the CASE era in one curve.
- `stackoverflow_questions` (153 rows, 9 tag-mapped types, **2009–2025**): questions per year per tag from the Stack Exchange API — developer-attention proxy (e.g. BPMN peaks ~2014–2018, fades after).
- `wikipedia_pageviews` (116 rows, 12 article-mapped types, **2016–2025**): yearly en-Wikipedia pageviews from the Wikimedia REST API — general-audience attention proxy.

Caveats specific to the type series: each is a *proxy* (books lag practice by years; SO measures confusion as much as usage and decays platform-wide after 2022's LLM shift; Wikipedia measures curiosity, not authoring volume), term-to-type mapping is approximate ("UML" the term ≠ UML diagrams drawn), and absolute values are not comparable across the three sources — read each series for its *shape*, and corroborate across sources before adjusting a Prevalence/Momentum score.

**The raw source data is preserved alongside the curated layer** in five per-source tables, keyed by the original identifier (term/tag/article/package/repo) rather than the canonical entity, and at native granularity:

| Table | Grain | Rows | Notes |
|---|---|---|---|
| `google_books_ngram(ngram, year, frequency, corpus)` | per ngram-year, raw corpus fraction | 250 | corpus en-2019 |
| `stack_overflow_tags(tag, year, questions)` | per tag-year | 153 | |
| `wikipedia_pageviews(article, month, views)` | **monthly**, from 2015-07 | 1,451 | en.wikipedia |
| `npm_downloads(package, month, downloads)` | **monthly**, from 2015-01 | 311 | |
| `github_stars(repo, year, stars_gained)` | per repo-year, renames **not** merged | 91 | GH Archive |

`diagram_metric_history` / `tool_metric_history` are the curated aggregations of these (key-mapped, yearly, renames merged); a consistency spot-check (Mermaid 2022 stars: raw 13,185 = curated 13,185) ties the layers together. If the layers ever disagree, the raw tables win — re-derive the curated rows. All raw rows carry `fetched_at = 2026-06-11`.

Two caveats keep this honest. **Coverage is asymmetric**: stars/downloads only exist for OSS tools (GH Archive starts 2011, npm counts start 2015 — nothing measurable exists for the desktop era), and vendor user counts are marketing claims — comparable within one vendor over time, not across vendors. **The metrics do not feed the composite mechanically**: they are the evidence base that the Adoption/Momentum estimates must stay consistent with, and the first thing to check when revising a score. Tools that never made a top-10 but are measurable (D2, bpmn-js, GoJS, JointJS, Kroki, mingrammer, nomnoml, tldraw) exist in `tools` as catalog-only entities so their metrics have a home.

External published rankings were considered and largely rejected as anchors: no per-year market-share series for diagramming exists, G2/Capterra grids are present-day and methodology-opaque, and developer surveys (Stack Overflow) don't break out diagram tools. The one citable recognition kept is Mermaid's 2019 JS Open Source Award.

## 5. Limitations

- Scores inherit the uncertainty of the underlying estimates; treat second-decimal differences as noise.
- Momentum is derived from list movement, so it is partly circular by construction — it encodes the researched delta rather than an independent measurement.
- Criteria and weights are themselves editorial choices; revisit them if the field's success factors shift (e.g. agent-operability may deserve its own criterion beyond 2025).

---

← [Index](README.md)
