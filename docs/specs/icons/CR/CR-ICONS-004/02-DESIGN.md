---
title: "Icons CR-004 — Design: per-set IconifyJSON + sparse records + on-demand loader"
document_id: DESIGN-ICONS-CR004
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers building the IconifyJSON emit in the generator and the batched loader in icons-loader.ts / icons.py
review_cycle: Until CR-ICONS-004 is closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-004                # CR lead doc — scope (FR-2, FR-3, FR-5, FR-9, NFR-4)
  - TEST-ICONS-CR004            # CR verification
  - PLAN-ICONS-CR004            # CR plan
  - DESIGN-ICONS-001            # Baseline design (§3 format, §6 loader) this builds on
  - DESIGN-ICONS-CR003          # P2 generator this enriches
  - RES-ICONS-001               # Prior-art research (Iconify §2 format, §5 loading)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - iconify-json
  - sparse
  - minify
  - batching
  - cache
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-004 — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-ICONS-CR004                                 |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-004, TEST-ICONS-CR004, PLAN-ICONS-CR004, DESIGN-ICONS-001, DESIGN-ICONS-CR003, RES-ICONS-001 |

Realises **CR-ICONS-004** (FR-2, FR-3, FR-5, FR-9, NFR-4). Implements DESIGN-ICONS-001 §3 (format)
and §6 (loader) — the *metadata + on-demand* slice, on top of the P2 generator.

## 1. Scope

The per-set IconifyJSON shape, the sparse-record + minify-to-root rule, the searchable metadata
fields, and the batched/cached on-demand loader. Out of scope: the key rule (P1), the generator
plumbing itself (P2), vectorization (P4), the CLI (P6).

## 2. Per-set IconifyJSON (FR-2, FR-3, FR-5)

```jsonc
{
  "prefix": "aws",
  "width": 24, "height": 24, "left": 0, "top": 0,    // root defaults, inherited
  "icons": {
    "compute-lambda": { "body": "<path d=\"…\"/>" },  // inherits 24×24
    "storage-s3":     { "body": "<path d=\"…\"/>", "width": 32 }
  },
  "aliases": { "lambda-fn": { "parent": "compute-lambda" } },
  "info": { "name": "AWS", "total": 320, "author": {…}, "license": {…},
            "categories": { "Compute": ["compute-lambda"], … }, "tags": {…} }
}
```

- **Sparse + root defaults** (FR-3): a dimension/transform appears on an icon **only** when it
  differs from the set root; a `minifyIconSet`-style pass hoists the common value to the root.
- **Searchable metadata** (FR-5): `info` carries counts/author/license and `categories`/`tags`;
  combined with `aliases` and per-icon dims, a picker UI or the CLI can search and filter.
- **Self-describing**: `info` travels with the data — the consumer needs nothing else.

## 3. Generator emit (depends on P2)

The P2 generator (DESIGN-ICONS-CR003 §2) gains an **emit-IconifyJSON** stage: group icons by
prefix, run the sparse/minify pass, attach `info` (counts derived; author/license/tags from source
metadata), and write one `<prefix>.json` per set plus an index. Output stays deterministic
(NFR-1) and diffable.

## 4. On-demand loader (FR-9, NFR-4)

`icons-loader.ts` keeps `getIcon()`'s async shape but resolves against per-set artifacts:

```
getIcon(prefix:name):
  if cache[prefix].icons[name]: return it
  if name in cache[prefix].missing: throw unknown
  queue name under prefix; on flush → fetch one batched request per prefix
       (only the queued names)  → merge into cache[prefix].icons
       names not returned → cache[prefix].missing
  cache tiers: memory + localStorage where available
```

- **Batch** = one request per prefix for only the referenced icons (RES-ICONS-001 §5).
- **Cache** = `prefix → { icons, missing }`; a recorded miss is never re-requested (NFR-4).
- **No up-front whole-catalogue load** — only referenced prefixes/icons are fetched.

Python (`icons.py`) loads the per-set JSON for the prefixes a diagram references (cached on first
hit, as it already caches its scan). Both resolve the **same** record (parity).

## 5. Payload (NFR-4)

A per-icon payload is the SVG **body** (hundreds of bytes), not a base64 PNG/SVG document; a set's
metadata (`info`/tags) is fetched once per prefix and shared across its icons. Up-front load never
requires the whole catalogue.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — IconifyJSON shape, sparse/minify rule, metadata fields, batched/cached loader for P3. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-004/02-DESIGN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep FR-2/FR-3/FR-5/FR-9/NFR-4 traces consistent
with CR-ICONS-004; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This describes the intended implementation; the normative surface is FEAT-ICONS-001.
