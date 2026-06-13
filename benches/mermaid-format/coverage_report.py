#!/usr/bin/env python3
"""Build coverage REPORT.md from results/coverage/*.json (written by coverage.mjs)."""
import json
import pathlib

HERE = pathlib.Path(__file__).resolve().parent
COV = HERE / "results" / "coverage"
DATASETS = ["mermaid-kymo", "merman", "mermaid-cypress", "mermaid-to-svg"]
KYMO_GRAMMARS = {"flowchart", "sequence"}


def pctf(num, den):
    return "—" if not den else f"{100 * num / den:.0f}%"


def main():
    data = {ds: json.loads((COV / f"{ds}.json").read_text()) for ds in DATASETS if (COV / f"{ds}.json").exists()}

    # merge per-grammar across datasets
    merged = {}
    for ds, byg in data.items():
        for g, a in byg.items():
            m = merged.setdefault(g, {k: 0 for k in ("n", "merman_ok", "merman_fo", "merman_text", "kymo_n", "kymo_ok")})
            for k in m:
                m[k] += a.get(k, 0)

    order = sorted(merged, key=lambda g: -merged[g]["n"])
    total_n = sum(m["n"] for m in merged.values())
    total_ok = sum(m["merman_ok"] for m in merged.values())

    lines = [
        "# Mermaid engine coverage — kymo & merman over the raw corpora",
        "",
        f"*Renders every source in the `merman`, `mermaid-cypress` and `mermaid-to-svg`",
        f"datasets ({total_n:,} diagrams, 24 grammars) through merman (all grammars) and,",
        f"where kymo has its own engine (flowchart, sequence), through kymo too. Offline —",
        f"kymo + merman wasm only. Measures render success and whether the SVG is",
        f"raster-safe: real `<text>` survives PNG/PDF; `<foreignObject>` (HTML labels) does",
        f"not.*",
        "",
        "## By grammar (all datasets)",
        "",
        "| grammar | sources | merman renders | merman uses foreignObject | kymo engine | kymo renders |",
        "|---|---|---|---|---|---|",
    ]
    for g in order:
        m = merged[g]
        kymo = pctf(m["kymo_ok"], m["kymo_n"]) if g in KYMO_GRAMMARS else "—"
        keng = "✓" if g in KYMO_GRAMMARS else ""
        lines.append(
            f"| {g} | {m['n']:,} | {pctf(m['merman_ok'], m['n'])} | "
            f"{pctf(m['merman_fo'], m['merman_ok'])} | {keng} | {kymo} |"
        )
    lines.append(
        f"| **all** | {total_n:,} | {pctf(total_ok, total_n)} | "
        f"{pctf(sum(m['merman_fo'] for m in merged.values()), total_ok)} | | |"
    )

    lines += [
        "",
        "- **merman renders** — fraction of real sources merman parses+renders without",
        "  error (its robustness on the upstream corpus).",
        "- **merman uses foreignObject** — fraction of *rendered* SVGs that wrap labels in",
        "  `<foreignObject>`; a server-side resvg/svg2pdf raster drops those labels. High =",
        "  the grammar's PNG/PDF loses its text on render.kymo.studio (kroki hides this with",
        "  a real browser).",
        "- **kymo renders** — for the two grammars kymo has its own `<text>` engine, the",
        "  fraction it parses (the rest fall back to merman).",
        "",
        "## Per dataset",
        "",
        "| dataset | sources | merman renders | foreignObject grammars |",
        "|---|---|---|---|",
    ]
    for ds, byg in data.items():
        n = sum(a["n"] for a in byg.values())
        ok = sum(a["merman_ok"] for a in byg.values())
        fo_g = sum(1 for a in byg.values() if a["merman_ok"] and a["merman_fo"] / a["merman_ok"] > 0.5)
        lines.append(f"| {ds} | {n:,} | {pctf(ok, n)} | {fo_g}/{len(byg)} |")

    # detailed: each dataset, every grammar
    lines += ["", "## By dataset, by grammar", ""]
    for ds, byg in data.items():
        n_ds = sum(a["n"] for a in byg.values())
        lines += [f"### {ds} ({n_ds:,} sources)", "",
                  "| grammar | sources | merman renders | foreignObject | kymo |",
                  "|---|---|---|---|---|"]
        for g, a in sorted(byg.items(), key=lambda x: -x[1]["n"]):
            kymo = pctf(a["kymo_ok"], a["kymo_n"]) if a["kymo_n"] else "—"
            to = f" (+{a['timeout']} timeout)" if a.get("timeout") else ""
            lines.append(
                f"| {g} | {a['n']:,}{to} | {pctf(a['merman_ok'], a['n'])} | "
                f"{pctf(a['merman_fo'], a['merman_ok'])} | {kymo} |"
            )
        lines.append("")

    lines += [
        "",
        "## Reading",
        "",
        "- merman is robust across the upstream corpus — most grammars render near-fully;",
        "  failures are stress/edge fixtures and a few not-yet-ported features.",
        "- The **foreignObject** column is the raster-text problem at scale: the grammars",
        "  that score high there (flowchart, class, state, er, mindmap, …) lose their labels",
        "  in a server-side PNG/PDF. The grammars near 0% (sequence, gantt, pie, …) are",
        "  raster-safe already.",
        "- kymo's own engine covers the bulk of real flowchart and sequence sources; what",
        "  it can't parse falls back to merman, so output is never worse — only the raster",
        "  text and the look change.",
        "",
    ]
    (HERE / "results" / "COVERAGE.md").write_text("\n".join(lines))
    print("wrote results/COVERAGE.md")


if __name__ == "__main__":
    main()
