#!/usr/bin/env python3
"""BPMN bench — CORRECTNESS aggregator.

Read-only and pure-stdlib (no `kymo` import, no re-rendering). It reads the
quality snapshots the test suites already commit and rolls them up into a
single flat metrics record:

  • render pass-rate — from the committed MIWG corpus baselines
        packages/python/tests/corpus_bpmn/baseline_full.json   (full 840-file)
        packages/python/tests/corpus_bpmn/baseline.json        (120-file gate)
    Each maps a file id → {status, n_nodes, n_edges, sha}; we just count status.
  • Python↔JS parity — from the conformance goldens
        conformance/golden/bpmn_import.json   (stems imported to a canonical model)
        conformance/golden/bpmn_export.json   (stems re-exported to a digest)
        conformance/known_divergences.json    (tracked divergences; empty = full parity)
  • element coverage — from the normative mapping table
        docs/formats/bpmn/kymo-mapping.md  (BPMN-MAP-001)

These are *offline* numbers: they reflect the snapshots as committed, not a live
render. Regenerate the snapshots themselves with the suites' own
KYMO_UPDATE_* flags (see packages/python/tests), then re-run this to refresh.

Run standalone:  python bpmn/quality.py        # writes results/quality.json
Or import:       from quality import collect    # returns the metrics dict
"""
from __future__ import annotations

import json
import re
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]  # bench/bpmn -> bench -> repo root
RESULTS = HERE / "results"

BASELINE_FULL = ROOT / "packages/python/tests/corpus_bpmn/baseline_full.json"
BASELINE_GATE = ROOT / "packages/python/tests/corpus_bpmn/baseline.json"
IMPORT_GOLDEN = ROOT / "conformance/golden/bpmn_import.json"
EXPORT_GOLDEN = ROOT / "conformance/golden/bpmn_export.json"
DIVERGENCES = ROOT / "conformance/known_divergences.json"
MAPPING = ROOT / "docs/formats/bpmn/kymo-mapping.md"


def _load(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def _status_counts(baseline: dict) -> dict:
    out = {"total": len(baseline), "ok": 0, "empty_output": 0, "error": 0}
    for rec in baseline.values():
        key = {"ok": "ok", "empty-output": "empty_output", "error": "error"}.get(rec.get("status"))
        if key:
            out[key] += 1
    return out


def _element_coverage(md: str) -> dict:
    """Count BPMN element types mapped, from the import 'Element mapping' table.

    Method (kept explicit so the number is auditable): take the table under
    '## Element mapping' up to the next heading; for each top-level row (skip the
    `&nbsp;`-indented sub-rows), collect the backtick-quoted tokens in the first
    column — that is the set of BPMN element local-names the importer maps.
    Event-definition glyphs are counted separately from the dedicated row.
    """
    section = re.search(r"## Element mapping\n(.*?)\n## ", md, re.S)
    body = section.group(1) if section else ""
    elements: set[str] = set()
    event_defs: set[str] = set()
    for line in body.splitlines():
        if not line.startswith("|") or "&nbsp;" in line:
            continue
        cols = [c.strip() for c in line.strip().strip("|").split("|")]
        if len(cols) < 2 or cols[0] in {"BPMN element", "---"} or set(cols[0]) <= {"-"}:
            continue
        toks = re.findall(r"`([A-Za-z][\w*]*)`", cols[0])
        if cols[0].lower().startswith("event definitions"):
            event_defs.update(re.findall(r"`([a-z]+)`", cols[1]))
            continue
        elements.update(toks)
    return {"elements_mapped": len(elements), "event_definitions": len(event_defs)}


def collect() -> dict:
    full = _status_counts(_load(BASELINE_FULL))
    gate = _status_counts(_load(BASELINE_GATE))
    imp = _load(IMPORT_GOLDEN)
    exp = _load(EXPORT_GOLDEN)
    div = _load(DIVERGENCES)
    coverage = _element_coverage(MAPPING.read_text(encoding="utf-8"))

    n_import, n_div = len(imp), len(div)
    return {
        "generated_by": "bench/bpmn/quality.py",
        "render": {
            "corpus_full": full["total"],
            "ok": full["ok"],
            "empty_output": full["empty_output"],
            "error": full["error"],
            "pass_rate": round(full["ok"] / full["total"], 4) if full["total"] else 0.0,
            "error_rate": round(full["error"] / full["total"], 4) if full["total"] else 0.0,
            "corpus_gate": gate["total"],
            "gate_ok": gate["ok"],
            "gate_empty_output": gate["empty_output"],
        },
        "parity": {
            "import_stems": n_import,
            "export_stems": len(exp),
            "divergences": n_div,
            "parity_rate": round(1 - n_div / n_import, 4) if n_import else 0.0,
        },
        "coverage": coverage,
        "sources": {
            "baseline_full": str(BASELINE_FULL.relative_to(ROOT)),
            "baseline_gate": str(BASELINE_GATE.relative_to(ROOT)),
            "import_golden": str(IMPORT_GOLDEN.relative_to(ROOT)),
            "export_golden": str(EXPORT_GOLDEN.relative_to(ROOT)),
            "divergences": str(DIVERGENCES.relative_to(ROOT)),
            "mapping": str(MAPPING.relative_to(ROOT)),
        },
    }


def main() -> None:
    RESULTS.mkdir(parents=True, exist_ok=True)
    data = collect()
    (RESULTS / "quality.json").write_text(
        json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8"
    )
    r, p, c = data["render"], data["parity"], data["coverage"]
    print(f"render  : {r['ok']}/{r['corpus_full']} ok ({r['pass_rate']:.1%}), "
          f"{r['empty_output']} empty, {r['error']} error")
    print(f"parity  : import {p['import_stems']} / export {p['export_stems']} stems, "
          f"divergences {p['divergences']} ({p['parity_rate']:.0%})")
    print(f"coverage: {c['elements_mapped']} element types, {c['event_definitions']} event-definitions")
    print(f"wrote   : {(RESULTS / 'quality.json').relative_to(ROOT)}")


if __name__ == "__main__":
    main()
