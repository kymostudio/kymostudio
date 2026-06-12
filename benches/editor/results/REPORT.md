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

| Scenario | reps (failed) | TTFB | FCP | kroki sent | kroki done | **diagram visible** | wire KB (engine KB) |
|---|---|---|---|---|---|---|---|
| mermaid-share | 5 (3) | 278 ms | 924 ms | 747 ms | 3,399 ms | **3,408 ms** | 211 (0) |
| kymo-default | 5 (0) | 274 ms | 1,616 ms | — ms | — ms | **4,465 ms** | 2,677 (2,465) |

Metric of record is **diagram visible** — first SVG in the preview pane.
`kroki done − kroki sent` is kroki.io's own server-side render; the editor
controls everything to the left of it (see `research/` for the analyses).
