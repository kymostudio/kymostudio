---
title: "Icons CR-002 — Design: `prefix:name` key + alias resolution + legacy compatibility"
document_id: DESIGN-ICONS-CR002
version: "0.1"
issue_date: 2026-06-05
status: Open
classification: Internal
owner: diagrams/ project
audience: Engineers implementing the icon key + alias layer in packages/python (icons.py) and packages/js (icons-loader.ts)
review_cycle: Until CR-ICONS-002 is closed (implemented + phase-completed, or rejected)
supersedes: null
related_documents:
  - CR-ICONS-002                # CR lead doc — scope (FR-1, FR-4, FR-11)
  - TEST-ICONS-CR002            # CR verification
  - PLAN-ICONS-CR002            # CR plan
  - DESIGN-ICONS-001            # Baseline design (§3 catalogue format) this builds on
  - RES-ICONS-001               # Prior-art research (Iconify aliases §3)
authors:
  - Vũ Anh
language: en
keywords:
  - icons
  - prefix-name
  - aliases
  - cycle-guard
  - compatibility-map
  - parity
iso_compliance:
  - ISO/IEC/IEEE 12207:2017
  - ISO/IEC/IEEE 15289:2019
  - ISO 8601:2019
---

# Icons CR-002 — Design

| Field        | Value                                              |
|--------------|----------------------------------------------------|
| Document ID  | DESIGN-ICONS-CR002                                 |
| Version      | 0.1                                                |
| Status       | Open                                               |
| Issue Date   | 2026-06-05                                         |
| Owner        | `diagrams/` project                                |
| Related      | CR-ICONS-002, TEST-ICONS-CR002, PLAN-ICONS-CR002, DESIGN-ICONS-001, RES-ICONS-001 |

Realises **CR-ICONS-002** (FR-1, FR-4, FR-11). Refines DESIGN-ICONS-001 §3 for the **addressing**
slice only — the stored art and the manifest format are unchanged at P1.

## 1. Scope

The `prefix:name` key grammar, the alias-resolution algorithm (parent chain + transforms + cycle
guard), the legacy `<provider>-<name>` compatibility map, and the two-package realisation in
`packages/python/src/kymo/icons.py` (`_scan_icons_dir`, `get_icon`) and
`packages/js/src/icons-loader.ts` (`getIcon`, manifest). Out of scope: the generator (P2), the
IconifyJSON metadata manifest (P3), vectorization (P4).

## 2. Key grammar (FR-1)

```
address := prefix ":" name
prefix  := ^[a-z0-9]+(-[a-z0-9]+)*$
name    := ^[a-z0-9]+(-[a-z0-9]+)*$        # category retained INSIDE the name
```

The current scanner collapses `icons/<provider>/<category>/<name>` → `<provider>-<name>`, dropping
`<category>` (`_scan_icons_dir` / `build-manifest.mjs`). The fix keeps the category in the name:
`icons/aws/compute/ec2.png` → **`aws:compute-ec2`** (or a deterministic, documented join), so two
icons that previously collapsed to the same `<provider>-<name>` now hold **distinct** addresses.
The set is the `prefix` (`aws`); the rest is the `name`. The mapping from path → address is the one
shared rule both packages apply.

## 3. Alias resolution (FR-4)

An alias is `{ parent: "prefix:name", rotate?: 1|2|3, hFlip?: bool, vFlip?: bool }`. Resolution:

```
resolve(addr, seen={}):
  if addr in icons:   return record(addr)
  if addr in aliases:
     if addr in seen: error "alias cycle: " + addr        # cycle guard
     a = aliases[addr]
     base = resolve(a.parent, seen ∪ {addr})
     return mergeTransforms(base, a)                       # compose rotate/hFlip/vFlip
  error "unknown icon: " + addr
```

Synonyms (`{parent}` only) return the parent fragment unchanged; transformed variants compose the
transform onto the parent. Cycles are **rejected with a clear error**, never looped (TC-3). This
matches RES-ICONS-001 §3 and is implemented identically in both packages.

## 4. Legacy compatibility (FR-11)

A generated **compatibility map** `legacy := { "<provider>-<name>": "prefix:name" }` is consulted
when a lookup key contains no `:`. For the ~2,300 legacy keys that were unambiguous it is a 1:1
entry; for the ~157 that previously collided, the legacy key maps to the **same** target the old
last-write-wins resolution would have returned (so existing diagrams are byte-stable, TC-10/TC-11),
while the **other** colliding icons gain fresh `prefix:name` addresses (now reachable, TC-1). The
map is emitted as a side-file at P1 and folded into the generator at P2.

## 5. Two-package realisation (FR-10, parity)

| Concern | `packages/python` (`icons.py`) | `packages/js` (`icons-loader.ts`) |
|---------|--------------------------------|-----------------------------------|
| Path → address | extend `_scan_icons_dir()` to emit `prefix:name` (keep category) | extend `build-manifest.mjs` with the same rule |
| Lookup | `get_icon(addr)`: try `prefix:name`, then alias chain, then legacy map | `getIcon(addr)`: same order |
| Aliases | alias table loaded beside `_FILE_ICONS` | alias table beside the manifest |
| Cycle guard | `seen` set in the resolver | `seen` set in the resolver |

The path→address rule, alias algorithm, and legacy map are a **single shared specification**; the
golden conformance suite (Python as sole writer) compares resolved fragments for parity (NFR-1).

## 6. Byte-stability (NFR-2)

Re-keying changes only the *address*, not the resolved SVG fragment. For any diagram whose icons
are unaffected, `get_icon`/`getIcon` returns the identical bytes it returns today, so golden SVG and
BPMN-corpus baselines do not churn (TC-11). New addresses simply make previously-shadowed icons
reachable.

## Annex A — Revision History

| Version | Date       | Author | Changes |
|---------|------------|--------|---------|
| 0.1     | 2026-06-05 | Vũ Anh | Initial issue — design of the `prefix:name` key, alias resolver with cycle guard, and legacy compatibility map for P1. |

## Annex B — Document Control

### B.1 Storage and Retrieval
Version-controlled at `docs/specs/icons/CR/CR-ICONS-002/02-DESIGN.md`; authoritative source is the
main-branch working tree (history via `git log`).

### B.2 Distribution
Implicit — checked in with the CR; available to all repository readers.

### B.3 Change Control
On a design change: update the affected clause; keep the FR-1/FR-4/FR-11 traces consistent with
CR-ICONS-002; increment `version`; append a row to Annex A.

### B.4 Backwards Compatibility
This describes the intended implementation; the normative surface is FEAT-ICONS-001. Reconcile any
deviation there before phase completion.
