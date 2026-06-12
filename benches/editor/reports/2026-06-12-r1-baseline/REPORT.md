# editor bench — share-link first load

*2026-06-12T07:00:46+00:00 · https://editor.kymo.studio · anhvu2-01.local (macOS-26.4.1-arm64-arm-64bit-Mach-O) · chrome · Fast 4G throttle (165 ms RTT, 8,493 kbit/s down)*

Snapshot, not a gate: the editor is deployed software and kroki.io is a live
third-party renderer — timing varies with the network and with kroki's queue.

## Quality — what a cold load contains

| Scenario | OK | Diagram | Labels | Engine chunk | Notes |
|---|---|---|---|---|---|
| mermaid-share | ✅ | ✅ | ✅ | not fetched ✅ | early kick-off adopted |
| kymo-default | ✅ | ✅ | ✅ | fetched ✅ | — |

## Performance — cold load on Fast 4G (medians)

| Scenario | reps (failed) | TTFB_MS | FCP_MS | KROKI_SENT_MS | KROKI_DONE_MS | **DIAGRAM_VISIBLE_MS** | WIRE_TOTAL_KB (WIRE_ENGINE_KB) |
|---|---|---|---|---|---|---|---|
| mermaid-share | 5 (3) | 278 🟢 ms | 924 🟢 ms | 747 🟢 ms | 3,399 ms | **3,408 🟡 ms** | 211 🟢 (0) |
| kymo-default | 5 (0) | 274 🟢 ms | 1,616 🟢 ms | — ms | — ms | **4,465 🔴 ms** | 2,677 🔴 (2,465) |

Metric of record is **DIAGRAM_VISIBLE_MS** — first SVG in the preview pane.
`KROKI_DONE_MS − KROKI_SENT_MS` is kroki.io's own server-side render; the
editor controls everything to the left of it (see `research/` for the analyses).

## Baselines

Medians are graded 🟢 good / 🟡 needs improvement / 🔴 poor against:

| Metric | 🟢 ≤ | 🔴 > | Source |
|---|---|---|---|
| TTFB_MS | 800 ms | 1,800 ms | [web.dev/ttfb](https://web.dev/articles/ttfb) |
| FCP_MS | 1,800 ms | 3,000 ms | [web.dev/fcp](https://web.dev/articles/fcp) |
| DIAGRAM_VISIBLE_MS | 2,500 ms | 4,000 ms | LCP budget, [web.dev/lcp](https://web.dev/articles/lcp) — the diagram is the page's largest contentful element |
| KROKI_SENT_MS | 1,000 ms | 2,000 ms | house: under 1 s = the inline kick-off beat the bundle (no public standard) |
| WIRE_TOTAL_KB | 600 KB | 2,400 KB | house, anchored to the ~2.4 MB median page — [HTTP Archive Web Almanac 2025](https://almanac.httparchive.org/en/2025/page-weight) |

KROKI_DONE_MS is ungraded (kroki.io's server-side render — a third party's
number); WIRE_ENGINE_KB is pass/fail per scenario in the quality pass. Google
defines its buckets on the 75th percentile of *field* data; this bench grades
the median of N *throttled lab* loads — a stricter network than typical field
traffic, so a 🟡 here is not a CrUX 🟡.
