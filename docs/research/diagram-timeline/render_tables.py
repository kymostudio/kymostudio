#!/usr/bin/env python3
"""Render the per-year Top-10 tables in 1995.md…2025.md from docs/data/database.sqlite.

The database is the source of truth for the rankings:
  diagrams(key, name) / tools(key, name)          — canonical entities
  diagram_rankings / tool_rankings(year, rank 1-10, key FK, label, evidence)
  timeline(year, remark)
`key` is the canonical identity of a type/tool across years; rank movement
(Δ) and drop-outs are computed from it. After editing the DB, run:
  python3 render_tables.py
"""
import re
import sqlite3
from pathlib import Path

HERE = Path(__file__).parent
DB = HERE.parent.parent / "data" / "database.sqlite"
YEARS = range(1995, 2026)
HEAD = {"type": "Top 10 diagram types", "tool": "Top 10 tools"}
COL = {"type": "Type", "tool": "Tool"}

# Matches the whole rankings block: the (Top 5|Top 10) types heading through
# the italic estimates note that closes the tools table.
BLOCK = re.compile(
    r"## Top \d+ diagram types\n.*?\n\*Rankings are evidence-based estimates[^\n]*\*",
    re.S,
)


def delta(rank, prev_rank, first_year, year):
    if year == min(YEARS):
        return "—"
    if prev_rank is None:
        return "new" if first_year == year else "back"
    if prev_rank == rank:
        return "="
    return f"↑{prev_rank - rank}" if prev_rank > rank else f"↓{rank - prev_rank}"


def main():
    con = sqlite3.connect(DB)
    rows = con.execute(
        "SELECT year, 'type', rank, key, label, evidence FROM diagram_rankings"
        " UNION ALL"
        " SELECT year, 'tool', rank, key, label, evidence FROM tool_rankings"
    ).fetchall()
    remarks = dict(con.execute("SELECT year, remark FROM timeline").fetchall())
    con.close()

    data = {}  # (year, cat) -> {key: (rank, label, evidence)}
    first_seen = {}  # (cat, key) -> first year present
    for year, cat, rank, key, label, ev in rows:
        data.setdefault((year, cat), {})[key] = (rank, label, ev)
        fk = (cat, key)
        first_seen[fk] = min(first_seen.get(fk, year), year)

    for year in YEARS:
        parts = []
        dropped = []
        for cat in ("type", "tool"):
            cur = data[(year, cat)]
            prev = data.get((year - 1, cat), {})
            lines = [f"## {HEAD[cat]}", "",
                     f"| # | Δ | {COL[cat]} | Evidence / why |",
                     "|---|---|------|----------------|"]
            for key, (rank, label, ev) in sorted(cur.items(), key=lambda kv: kv[1][0]):
                d = delta(rank, prev.get(key, (None,))[0], first_seen[(cat, key)], year)
                lines.append(f"| {rank} | {d} | {label} | {ev} |")
            parts.append("\n".join(lines))
            gone = [prev[k][1] for k in prev if k not in cur]
            if gone:
                dropped.append(f"{', '.join(sorted(gone))} ({cat}s)")

        note = "*Rankings are evidence-based estimates — no per-year market-share survey exists; Δ is the rank change vs the previous year (new = first appearance, back = re-entry)."
        if dropped:
            note += f" Dropped out vs {year - 1}: {'; '.join(dropped)}."
        if remarks.get(year):
            note += f" {remarks[year]}"
        note += "*"

        block = "\n\n".join(parts) + "\n\n" + note
        path = HERE / f"{year}.md"
        text = path.read_text()
        new_text, n = BLOCK.subn(lambda _m: block, text, count=1)
        if n != 1:
            raise SystemExit(f"{path.name}: rankings block not found")
        if new_text != text:
            path.write_text(new_text)
            print(f"{path.name}: updated")
        else:
            print(f"{path.name}: unchanged")


if __name__ == "__main__":
    main()
