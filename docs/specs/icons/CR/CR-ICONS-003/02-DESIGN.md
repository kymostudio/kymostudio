---
title: "Icons CR-003 — Design: the single icon generator + two-package wiring"
document_id: DESIGN-ICONS-CR003
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers building the generator (packages/js/scripts) and wiring icons.py / icons-loader.ts to its output
review_cycle: Until CR-ICONS-003 is closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-003                # CR lead doc — scope (FR-8, FR-10, NFR-1, NFR-3)
  - TEST-ICONS-CR003            # CR verification
  - PLAN-ICONS-CR003            # CR plan
  - DESIGN-ICONS-001            # Baseline design (§4 generator) this builds on
  - DESIGN-ICONS-CR002          # P1 design — key rule + legacy map the generator owns
  - RES-ICONS-001               # Prior-art research (Iconify build pipeline §4)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - generator
  - pipeline
  - determinism
  - zero-dependency
  - parity
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-003 — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-ICONS-CR003                                 |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-003, TEST-ICONS-CR003, PLAN-ICONS-CR003, DESIGN-ICONS-001, DESIGN-ICONS-CR002, RES-ICONS-001 |

Realises **CR-ICONS-003** (FR-8, FR-10, NFR-1, NFR-3). Implements DESIGN-ICONS-001 §4 — the
generator becomes the single source of truth; this CR is the *build-unification* slice.

## 1. Scope

The generator (extending `packages/js/scripts/build-manifest.mjs`), the artifact it emits, the
deletion of the second scanner, the wiring of `icons.py` and `icons-loader.ts` to the artifact, and
the parity gate. Out of scope: the IconifyJSON metadata shape (P3) and vectorization (P4).

## 2. Generator architecture (FR-8, NFR-3)

```
generate(icons/, { prefix per top-level dir })
  ├─ enumerate source art (deterministic sort)
  ├─ apply the P1 path→prefix:name rule  (DESIGN-ICONS-CR002 §2)
  ├─ normalize pipeline (RES-ICONS-001 §4) — scaffolded here, exercised in P4:
  │     cleanupSVG → parseColors(currentColor) → SVGO → validate
  ├─ deduplicate identical bodies → aliases   (P1 alias model)
  ├─ emit the legacy compatibility map         (DESIGN-ICONS-CR002 §4)
  └─ write the catalogue artifact (stable key order → diffable)
```

- The generator is **the only** thing that walks `icons/`. Both packages read its output.
- **Build-time tooling only** (SVGO, an `@iconify/tools`-equivalent) lives in the generator's
  `devDependencies`; nothing is added to `packages/js` runtime deps (NFR-3).
- Output is **deterministic** (sorted keys, normalized whitespace) so diffs are reviewable and the
  parity check is exact (NFR-1).

## 3. Retiring the second scanner (FR-8)

| Today | After P2 |
|-------|----------|
| `_scan_icons_dir()` (Python) walks `icons/` | `icons.py` loads the generated artifact (cached on first hit, like the current scan cache) |
| `build-manifest.mjs` (JS) walks `icons/` | promoted to the generator; `icons-loader.ts` loads its output |
| two rules kept compatible *by convention* | **one** rule in the generator; the Python scanner is deleted |

`icons.py`'s `get_icon()` and `icons-loader.ts`'s `getIcon()` keep their signatures; only their
**source** changes from a self-scan to the generated artifact.

## 4. Two-package wiring (FR-10, NFR-1)

| Concern | `packages/python` | `packages/js` |
|---------|-------------------|---------------|
| Reads | generated artifact (replaces `_scan_icons_dir`) | generated artifact (replaces inline walk) |
| Build | consumes committed artifact; no Node at runtime | `npm run build-manifest` → generator |
| Deps | stdlib only | zero runtime deps; generator deps are dev-only |
| Parity | reference impl + sole golden writer | reconciled toward Python |

The conformance suite loads the same artifact in both languages and compares resolved records
(body + effective dims after alias resolution). A divergence is a defect reconciled toward Python
(NFR-1), per `CLAUDE.md`.

## 5. Determinism & CI

The generator SHALL be reproducible: same `icons/` → byte-identical artifact. CI MAY assert
"generated artifact is up to date" (re-run the generator, diff against the committed file) so a
hand-edited or stale artifact fails the build.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — generator architecture, scanner retirement, two-package wiring, determinism/CI for P2. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-003/02-DESIGN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep FR-8/FR-10/NFR-1/NFR-3 traces consistent with
CR-ICONS-003; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This describes the intended implementation; the normative surface is FEAT-ICONS-001.
