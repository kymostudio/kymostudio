# Kymo Editor — Change-Request Log

Change-requests against the baselined `kymo-editor` umbrella spec and its modules
(`FEAT-KEDITOR-001` + `editor-render`/`-live`/`-share`/`-library`/`-mcp`). One file
per CR (`CR-KEDITOR-NNN.md`), self-contained (motivation → findings/change → amended
clauses → acceptance → record), citing other docs by `document_id`. Log each row below.

| CR | Title | Target baseline | Status | Date |
|----|-------|-----------------|--------|------|
| `CR-KEDITOR-001` | Per-file open latency vs a native (VS Code) editor — diagnosis & optimization plan | `FEAT-KRENDER-001`, `FEAT-KLIVE-001` | Open | 2026-06-14 |
| `CR-KEDITOR-002` | Session lifetime — replace the raw Google ID token with a Worker-issued httpOnly session cookie (sliding 14d / absolute 30d) | `FEAT-KLIVE-001` | Open | 2026-06-17 |
