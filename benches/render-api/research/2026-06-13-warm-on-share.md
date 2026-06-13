# Warm-on-share: render at the moment of intent

*A follow-up to [the same day's round](2026-06-13-self-render-at-the-edge.md).
Written 2026-06-13 — the round behind the editor's warm-on-share fetch. The
committed [`../results/REPORT.md`](../results/REPORT.md) carries the new
share-embed GET rows.*

## The idea

Opening the Share menu is a declaration of intent: someone else is about to
fetch this exact content. The editor now fires one fire-and-forget POST to
`render.kymo.studio/{kind}/svg` at that moment (deduped per kind+source). POST
and the share-URL GET hash to the same content-addressed cache entry, so the
recipient's first paint — and GitHub's first fetch of a Copy-Markdown-image
URL — finds the render already sitting at the edge.

## What it's worth

The bench's new share-embed GET rows flip the hit rate from 0/N to N/N by
construction; the *latency* value depends entirely on what a cold render
would have cost:

| First GET of fresh content | cold | pre-warmed |
|---|---|---|
| mermaid, from DE | 46 ms | 38 ms |
| mermaid, from VN | 138 ms | 129 ms |
| plantuml, from VN | **1,229 ms** | **125 ms** |

For self-rendered kinds the worker was already fast — warming saves single
milliseconds. The win is the **proxied kinds**: a cold plantuml embed from
Vietnam pays VN → PoP → kroki.io and back (1.2 s); pre-warmed it's one edge
round-trip, ~10×. Warming also buys *availability*: the render happens while
kroki is known-good, so the embed survives kroki's bad hours.

## The honest caveat

`caches.default` is per-PoP. The sharer warms the PoP nearest *them*; a viewer
on another continent still pays the first miss there. That covers the common
case (audiences cluster near sharers, GitHub's camo fetches from few regions)
but is not a global guarantee — the global tier (R2) stays a
measured-need-only follow-up, as argued in the previous note.
