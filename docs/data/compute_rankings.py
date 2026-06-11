#!/usr/bin/env python3
"""The canonical ranking function for the diagram-timeline database.

A year's top-10 is the descending order of the weighted composite score

    composite(entry) = sum(criteria.weight * score(entry, criterion))

over the per-criterion 0-10 scores in diagram_scores / tool_scores, with
weights from the criteria table (they sum to 1 per category). Ties break by
the previous year's rank (lower first, absent last), then by key.

Usage (inside the docs/data uv project):
    uv run compute_rankings.py            # --check: stored ranks/scores match
    uv run compute_rankings.py --apply    # rewrite rank + score from scores

Workflow after editing scores or weights: --apply, then re-run
docs/research/diagram-timeline/render_tables.py to refresh the pages.
The method is documented in RES-DIAGRAM-TIMELINE-002
(docs/research/diagram-timeline/METHOD.md).
"""
import sqlite3
import sys
from pathlib import Path

DB = Path(__file__).parent / "database.sqlite"

TABLES = {  # category -> (rankings table, scores table)
    "type": ("diagram_rankings", "diagram_scores"),
    "tool": ("tool_rankings", "tool_scores"),
}


def composite(scores: dict[str, float], weights: dict[str, float]) -> float:
    """Weighted composite on a 0-10 scale; the single source of ranking truth."""
    missing = weights.keys() - scores.keys()
    if missing:
        raise ValueError(f"missing criterion scores: {sorted(missing)}")
    return round(sum(weights[c] * scores[c] for c in weights), 3)


def rank_year(entries: list[dict], prev_ranks: dict[str, int]) -> list[dict]:
    """Order entries (each {'key', 'composite'}) into ranks 1..n.

    Sort: composite DESC, previous-year rank ASC (absent last), key ASC.
    """
    ordered = sorted(
        entries,
        key=lambda e: (-e["composite"], prev_ranks.get(e["key"], 99), e["key"]),
    )
    for i, e in enumerate(ordered, 1):
        e["rank"] = i
    return ordered


def load(con, category):
    rankings, scores = TABLES[category]
    weights = dict(con.execute(
        "SELECT key, weight FROM criteria WHERE category = ?", (category,)))
    total = round(sum(weights.values()), 6)
    if total != 1.0:
        raise SystemExit(f"criteria weights for {category} sum to {total}, not 1")
    per_year: dict[int, dict[str, dict]] = {}
    for year, key, criterion, score in con.execute(
            f"SELECT year, key, criterion, score FROM {scores}"):
        per_year.setdefault(year, {}).setdefault(key, {})[criterion] = score
    stored = {}
    for year, key, rank, score in con.execute(
            f"SELECT year, key, rank, score FROM {rankings}"):
        stored[(year, key)] = (rank, score)
    return weights, per_year, stored


def main(apply: bool) -> int:
    con = sqlite3.connect(DB)
    problems = 0
    for category, (rankings, _) in TABLES.items():
        weights, per_year, stored = load(con, category)
        prev_ranks: dict[str, int] = {}
        for year in sorted(per_year):
            entries = [{"key": k, "composite": composite(s, weights)}
                       for k, s in per_year[year].items()]
            ordered = rank_year(entries, prev_ranks)
            for e in ordered:
                want = (e["rank"], e["composite"])
                got = stored.get((year, e["key"]))
                if got != want:
                    if apply:
                        con.execute(
                            f"UPDATE {rankings} SET rank = ?, score = ?"
                            " WHERE year = ? AND key = ?",
                            (e["rank"], e["composite"], year, e["key"]))
                    else:
                        problems += 1
                        print(f"{rankings} {year} {e['key']}:"
                              f" stored rank/score {got}, computed {want}")
            prev_ranks = {e["key"]: e["rank"] for e in ordered}
    if apply:
        con.commit()
        print("ranks and scores rewritten from criteria weights + scores")
    else:
        print("check passed" if problems == 0 else f"{problems} mismatches")
    con.close()
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main(apply="--apply" in sys.argv[1:]))
