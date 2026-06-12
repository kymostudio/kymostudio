#!/usr/bin/env python3
"""Seed the forecast years (2026-2055) of the diagram-timeline database.

The historical rankings (1995-2025) are evidence-based estimates; the rows
this script writes are **scenario projections** — an authored, internally
consistent extrapolation of the trajectories visible in 2025 (agent-operable
canvases, diagram-as-code as agent interchange, live system views). The
authored per-year orderings below are the scenario; the per-criterion scores
are seeded from them with the SAME heuristics as the historical seeding
(METHOD.md §3) so `compute_rankings.py --check` stays green by construction:

- Adoption / Prevalence  = 11 - rank
- Longevity / Persistence = years on the list so far (incl. this one), cap 10
- Momentum               = new 8 · back 7 · ^k 6+k (cap 10) · = 5 · vk 5-k (floor 1)
- Ecosystem / Tooling    = mean(position, longevity)
- Mindshare (tools)      = mean(position, momentum)

plus the calibration pass (reduce the lower entry, highest-weight criterion
first) so adjacent composites differ by >= 0.02 in the authored order.

Idempotent: deletes all year >= 2026 rows before inserting. Run inside
docs/data:  uv run seed_forecast.py   (then compute_rankings.py --check)
"""
import sqlite3
from pathlib import Path

DB = Path(__file__).parent / "database.sqlite"
FIRST, LAST = 2026, 2055
GAP = 0.025  # raw composite gap enforced between adjacent ranks

# --- new entities (generic categories, deliberately not invented brands) ---

NEW_TOOLS = {
    "agentdesign": "Agent-design platforms",
    "spatial": "Spatial / AR canvases",
    "livearch": "Live-architecture platforms",
    "provenance": "Provenance & trust layers",
}
NEW_DIAGRAMS = {
    "ctxgraph": "Context graph / knowledge map",
    "behmap": "Model-behavior map",
    "liveview": "Live system view / architecture twin",
    "agentorg": "Agent org / coordination chart",
    "simview": "Simulation / scenario view",
    "intent": "Intent & policy map",
}

# --- per-year display labels (canonical key stays the same) ---------------

LABELS = {
    ("tool", "llm"): [(2026, "ChatGPT / Claude as diagram generators"),
                      (2027, "AI assistant suites"),
                      (2047, "Ambient assistants")],
    ("type", "state"): [(2026, "State machine / agent-state graph"),
                        (2027, "Agent workflow graph")],
    ("type", "uml"): [(2026, "UML sequence"),
                      (2033, "Interaction / trace diagram")],
}


def label_for(cat, key, year, names):
    for y, lbl in reversed(LABELS.get((cat, key), [])):
        if year >= y:
            return lbl
    return names[key]


# --- the authored scenario: rank order per year, optional evidence --------
# Entry: "key" (evidence defaulted from movement) or ("key", "evidence").

TOOLS = {
    2026: [("mermaid", "Becomes the de-facto agent interchange format; takes #1 from Miro"),
           ("miro", "Yields #1 after four years; the human-canvas franchise plateaus"),
           ("llm", "Assistants draw more diagrams than any canvas hosts"),
           "excalidraw", "lucid", "drawio", "figjam",
           ("visio", "Legacy floor keeps eroding"),
           ("tldraw", "Canvas-as-SDK: embedded whiteboards spread through other products"),
           "eraser"],
    2027: [("llm", "The assistant is the front door: most diagrams now start as a prompt"),
           ("mermaid", "Interchange format under the assistants"),
           "miro", "excalidraw",
           ("figjam", "Platform pull: design + diagram + AI in one suite"),
           "lucid", "drawio", "tldraw", "eraser",
           ("visio", "Final year on the list")],
    2028: [("llm", "Holds #1"), "mermaid",
           ("figjam", "Suite gravity"), "miro", "excalidraw", "tldraw", "lucid", "drawio",
           "eraser",
           ("d2", "Declarative DSL niche grows with infra-as-code teams")],
    2029: [("llm", "Holds #1"),
           ("figjam", "Rising"), "mermaid",
           ("agentdesign", "Purpose-built surfaces where agent teams design systems"),
           "miro", "excalidraw", "tldraw", "lucid", "drawio", "d2"],
    2030: [("llm", "Holds #1"),
           ("agentdesign", "From niche to default for agent-heavy orgs"),
           "figjam", "mermaid", "excalidraw", "miro", "tldraw", "drawio", "lucid", "d2"],
    2031: [("agentdesign", "Takes #1: design surfaces built for mixed human-agent teams"),
           "llm", "figjam", "mermaid", "excalidraw", "tldraw", "miro", "drawio", "d2",
           ("lucid", "Tail of the SaaS-era franchise")],
    2032: ["agentdesign", "llm", "figjam", "excalidraw", "mermaid", "tldraw", "drawio",
           "miro", "d2", ("lucid", "Final year on the list")],
    2033: ["agentdesign", "llm", "figjam", "excalidraw", "tldraw", "mermaid", "drawio",
           "miro",
           ("spatial", "Headset/AR canvases reach everyday architecture reviews"),
           "d2"],
    2034: ["agentdesign", "llm", "figjam",
           ("tldraw", "SDK underneath a generation of embedded canvases"),
           "excalidraw", ("spatial", "Rising"), "mermaid", "drawio", "miro", "d2"],
    2035: ["agentdesign", "llm", "tldraw", "figjam", "spatial", "excalidraw", "mermaid",
           "drawio", "d2", ("miro", "Final year on the list")],
    2036: ["agentdesign", "llm", "tldraw", "figjam", "spatial",
           ("livearch", "Views derived from running systems, not drawn by anyone"),
           "excalidraw", "mermaid", "drawio", "d2"],
    2037: ["agentdesign", "llm",
           ("livearch", "Deploy pipelines ship an architecture view by default"),
           "tldraw", "spatial", "figjam", "excalidraw", "mermaid", "drawio", "d2"],
    2038: ["agentdesign", ("livearch", "Rising"), "llm", "spatial", "tldraw", "figjam",
           "excalidraw", "drawio", "mermaid", "d2"],
    2039: [("livearch", "Takes #1: the diagram of record is generated from the system"),
           "agentdesign", "llm", "spatial", "tldraw", "figjam", "excalidraw", "drawio",
           "mermaid", "d2"],
    2040: [("livearch", "Holds #1"), "agentdesign", "llm", "spatial", "tldraw", "figjam",
           "excalidraw", "drawio", "d2",
           ("mermaid", "Text syntax fades from view as agents speak structured models")],
    2041: [("livearch", "Holds #1"), "llm", "agentdesign", "spatial", "tldraw",
           "excalidraw", "figjam", "drawio", "d2",
           ("mermaid", "Final year on the list — absorbed into agent toolchains")],
    2042: [("livearch", "Holds #1"), "llm", "agentdesign", "spatial", "tldraw",
           "excalidraw", "figjam", "drawio", "d2",
           ("provenance", "Who/what asserted this view, and is it still true?")],
    2043: [("livearch", "Holds #1"), "llm", "agentdesign", "spatial", "tldraw",
           ("provenance", "Trust metadata becomes a purchase requirement"),
           "excalidraw", "figjam", "drawio", "d2"],
    2044: [("livearch", "Holds #1"), "llm", "spatial", "agentdesign", "provenance",
           "tldraw", "excalidraw", "figjam", "drawio", "d2"],
    2045: [("livearch", "Holds #1"), "llm", "spatial", "provenance", "agentdesign",
           "tldraw", "excalidraw", "drawio", "figjam", "d2"],
    2046: [("livearch", "Holds #1"), "llm", "spatial", "provenance", "agentdesign",
           "excalidraw", "tldraw", "drawio", "figjam", "d2"],
    2047: [("llm", "Ambient assistants retake #1: the interface outlives every canvas"),
           "livearch", "spatial", "provenance", "agentdesign", "excalidraw", "tldraw",
           "drawio", "d2", "figjam"],
    2048: [("llm", "Holds #1"), "livearch", "spatial", "provenance",
           ("excalidraw", "The open canvas commons endures"),
           "agentdesign", "drawio", "tldraw", "d2", "figjam"],
    2049: [("llm", "Holds #1"), "livearch", "spatial", "provenance", "excalidraw",
           "agentdesign", "drawio", "tldraw", "figjam", "d2"],
    2050: [("llm", "Holds #1"), "livearch",
           ("provenance", "Rising"), "spatial", "excalidraw", "drawio", "agentdesign",
           "tldraw", "figjam", "d2"],
    2051: [("llm", "Holds #1"), "livearch", "provenance", "spatial", "excalidraw",
           "drawio", "agentdesign", "tldraw", "figjam", "d2"],
    2052: [("llm", "Holds #1"), "livearch", "provenance", "spatial",
           ("drawio", "Self-hosted floor — the Visio role, two eras on"),
           "excalidraw", "agentdesign", "tldraw", "d2", "figjam"],
    2053: [("llm", "Holds #1"),
           ("provenance", "Verifying views matters more than producing them"),
           "livearch", "spatial", "drawio", "excalidraw", "tldraw", "agentdesign",
           "d2", "figjam"],
    2054: [("llm", "Holds #1"), "provenance", "livearch", "spatial", "excalidraw",
           "drawio", "tldraw", "agentdesign", "figjam", "d2"],
    2055: [("llm", "Holds #1"), "provenance", "livearch", "spatial", "excalidraw",
           "drawio", "agentdesign", "tldraw", "d2", "figjam"],
}

TYPES = {
    2026: [("flowchart", "Default"), "cloud", "ai",
           ("state", "Agent workflow graphs surge with multi-agent systems"),
           "uml", "erd", "c4", "dag", "mind", "journey"],
    2027: [("flowchart", "Holds #1"), "cloud",
           ("state", "Every agent framework renders its workflow graph"),
           "ai", "erd", "uml", "dag", "c4", "mind", "journey"],
    2028: [("flowchart", "Holds #1"), ("state", "Rising"), "cloud", "ai", "erd", "dag",
           "uml", "c4", "mind", "journey"],
    2029: [("flowchart", "Holds #1"), "state", "cloud",
           ("erd", "Data never dies"), "ai", "dag", "c4", "uml", "mind", "journey"],
    2030: [("flowchart", "Holds #1"), "state", "cloud", "erd", "dag", "c4", "uml",
           ("ctxgraph", "Context windows beget context maps"),
           "mind", "journey"],
    2031: [("flowchart", "Holds #1"), "state", "cloud",
           ("ctxgraph", "Knowledge maps become how teams brief their agents"),
           "erd", "dag", "c4", "uml", "mind", "journey"],
    2032: [("flowchart", "Holds #1"), "state", "ctxgraph", "cloud", "erd", "dag", "c4",
           "mind", "uml", ("journey", "Final year on the list")],
    2033: [("flowchart", "Holds #1"), "state", "ctxgraph", "cloud",
           ("uml", "Agent-trace reading revives the sequence diagram"),
           "erd", "dag",
           ("behmap", "Eval and safety reviews need a picture of model behavior"),
           "c4", "mind"],
    2034: [("flowchart", "Holds #1"), "state", "ctxgraph", "cloud",
           ("behmap", "Rising"), "uml", "erd", "dag", "c4", "mind"],
    2035: [("flowchart", "Holds #1"), "state", "ctxgraph", "behmap", "cloud", "uml",
           "erd", "dag", "mind", ("c4", "Final year — absorbed into live views")],
    2036: [("flowchart", "Holds #1"), "state",
           ("liveview", "The architecture diagram becomes a rendered query"),
           "ctxgraph", "behmap", "cloud", "uml", "erd", "dag",
           ("mind", "Final year on the list")],
    2037: [("flowchart", "Holds #1"), ("liveview", "Rising"), "state", "ctxgraph",
           ("agentorg", "Org charts for fleets of agents and their owners"),
           "behmap", "cloud", "uml", "erd", "dag"],
    2038: [("flowchart", "Holds #1"), "liveview", "state", "agentorg", "ctxgraph",
           "behmap", "cloud", "erd", "uml", "dag"],
    2039: [("flowchart", "Holds #1"), "liveview",
           ("agentorg", "Accountability views become a compliance artifact"),
           "state", "ctxgraph", "behmap", "cloud", "erd", "dag", "uml"],
    2040: [("flowchart", "Final year at #1 — a 46-year run"), "liveview", "agentorg",
           "state", "behmap", "ctxgraph", "cloud", "erd", "dag", "uml"],
    2041: [("liveview", "Takes #1: derived views outnumber drawn diagrams"),
           ("flowchart", "The 46-year reign ends; the form is immortal, the rank is not"),
           "agentorg", "state", "behmap", "ctxgraph", "cloud", "erd", "dag", "uml"],
    2042: [("liveview", "Holds #1"), "flowchart", "agentorg", "behmap", "state",
           "ctxgraph", "cloud", "erd", "dag", "uml"],
    2043: [("liveview", "Holds #1"), "flowchart", "agentorg", "behmap", "state",
           "ctxgraph", "erd", "cloud", "uml", ("dag", "Final year on the list")],
    2044: [("liveview", "Holds #1"), "flowchart", "agentorg", "behmap",
           ("simview", "What-if views: simulate the change before applying it"),
           "state", "ctxgraph", "erd", "cloud", "uml"],
    2045: [("liveview", "Holds #1"), "flowchart", "agentorg", ("simview", "Rising"),
           "behmap", "state", "ctxgraph", "erd", "cloud", "uml"],
    2046: [("liveview", "Holds #1"), "flowchart", "agentorg", "simview", "behmap",
           "ctxgraph", "state", "erd", "cloud", "uml"],
    2047: [("liveview", "Holds #1"), "flowchart", "simview", "agentorg", "behmap",
           "ctxgraph", "state", "erd", "uml",
           ("cloud", "Final year — static architecture absorbed by live views")],
    2048: [("liveview", "Holds #1"), "flowchart", "simview", "agentorg",
           ("intent", "What is this system allowed to want? Policy made visible"),
           "behmap", "ctxgraph", "state", "erd", "uml"],
    2049: [("liveview", "Holds #1"), "flowchart", "simview",
           ("intent", "Rising"), "agentorg", "behmap", "ctxgraph", "state", "erd",
           "uml"],
    2050: [("liveview", "Holds #1"), "flowchart", "intent", "simview", "agentorg",
           "behmap", "ctxgraph", "state", "erd", "uml"],
    2051: [("liveview", "Holds #1"), "flowchart", "intent", "simview", "agentorg",
           "behmap", "ctxgraph", "state", "erd", "uml"],
    2052: [("liveview", "Holds #1"),
           ("intent", "The negotiation layer between human goals and machine plans"),
           "flowchart", "simview", "agentorg", "behmap", "ctxgraph", "erd", "state",
           "uml"],
    2053: [("liveview", "Holds #1"), "intent", "flowchart", "simview", "agentorg",
           "ctxgraph", "behmap", "erd", "state", "uml"],
    2054: [("liveview", "Holds #1"), "intent", "flowchart", "simview", "agentorg",
           "ctxgraph", "behmap", "erd", "uml", "state"],
    2055: [("liveview", "Holds #1"), "intent",
           ("flowchart", "Still top-3 after 61 years"),
           "simview", "agentorg", "ctxgraph", "behmap", "erd", "state", "uml"],
}

REMARKS = {
    2026: "PlantUML exits after 12 years as assistants subsume text-to-UML.",
    2028: "Visio exits the tools list for the first time in the timeline's 34 years.",
    2029: "Near-misses: Whimsical-class suites, Kroki-style render gateways.",
    2030: "AI-generated diagrams retires as a type: when everything is generated, "
          "generation stops being a category.",
    2033: "Lucid exits the tools list — the last pure SaaS-era incumbent.",
    2036: "Miro (tools) and C4 (types) exit as live-architecture views arrive.",
    2037: "Mind map exits the types list after 37 years on it.",
    2041: "Flowchart yields #1 after 46 consecutive years — the longest run in the "
          "timeline.",
    2042: "Mermaid exits the tools list: the syntax dissolved into agent toolchains "
          "it helped create.",
    2044: "Data-pipeline / DAG exits, folded into live and simulation views.",
    2048: "System / agent architecture exits the types list, absorbed by live views.",
}

DEFAULT_EV = {"new": "First appearance", "back": "Re-enters", "=": "Steady",
              "up": "Rising", "down": "Slips"}


def normalize(rows):
    out = []
    for r in rows:
        out.append((r, None) if isinstance(r, str) else r)
    keys = [k for k, _ in out]
    assert len(keys) == 10 and len(set(keys)) == 10, keys
    return out


def momentum(rank, prev_rank, seen_before):
    if prev_rank is None:
        return (7.0, "back") if seen_before else (8.0, "new")
    if prev_rank == rank:
        return 5.0, "="
    if prev_rank > rank:
        return float(min(10, 6 + prev_rank - rank)), "up"
    return float(max(1, 5 - (rank - prev_rank))), "down"


def seed_scores(cat, rank, mom, tenure):
    pos = float(11 - rank)
    lon = float(min(10, tenure))
    if cat == "tool":
        return {"adoption": pos, "longevity": lon, "momentum": mom,
                "ecosystem": (pos + lon) / 2, "mindshare": (pos + mom) / 2}
    return {"prevalence": pos, "persistence": lon, "momentum": mom,
            "tooling": (pos + lon) / 2}


def calibrate(entries, weights):
    """Reduce scores (highest weight first) so composites descend by >= GAP."""
    order = sorted(weights, key=lambda c: -weights[c])
    comp = lambda s: sum(weights[c] * s[c] for c in weights)
    prev = None
    for e in entries:  # entries already in authored rank order
        if prev is not None and comp(e["scores"]) > prev - GAP:
            need = comp(e["scores"]) - (prev - GAP)
            for c in order:
                if need <= 1e-12:
                    break
                cut = min(e["scores"][c], need / weights[c])
                e["scores"][c] -= cut
                need -= cut * weights[c]
            assert need <= 1e-9, f"cannot calibrate {e['key']}"
        e["scores"] = {c: round(v, 3) for c, v in e["scores"].items()}
        prev = comp(e["scores"])
        assert prev >= 0


def main():
    con = sqlite3.connect(DB)
    con.execute("PRAGMA foreign_keys = ON")

    for key, name in NEW_TOOLS.items():
        con.execute("INSERT OR IGNORE INTO tools(key, name) VALUES (?, ?)", (key, name))
    for key, name in NEW_DIAGRAMS.items():
        con.execute("INSERT OR IGNORE INTO diagrams(key, name) VALUES (?, ?)",
                    (key, name))

    for table in ("diagram_rankings", "tool_rankings", "diagram_scores",
                  "tool_scores", "timeline"):
        con.execute(f"DELETE FROM {table} WHERE year >= ?", (FIRST,))

    for cat, data, rankings, scores_t, entity in (
            ("type", TYPES, "diagram_rankings", "diagram_scores", "diagrams"),
            ("tool", TOOLS, "tool_rankings", "tool_scores", "tools")):
        weights = dict(con.execute(
            "SELECT key, weight FROM criteria WHERE category = ?", (cat,)))
        names = dict(con.execute(f"SELECT key, name FROM {entity}"))
        hist = con.execute(
            f"SELECT key, COUNT(*), MAX(year) FROM {rankings} GROUP BY key").fetchall()
        tenure = {k: n for k, n, _ in hist}
        seen = set(tenure)
        prev_ranks = dict(con.execute(
            f"SELECT key, rank FROM {rankings} WHERE year = 2025"))

        for year in range(FIRST, LAST + 1):
            rows = normalize(data[year])
            entries = []
            for rank, (key, ev) in enumerate(rows, 1):
                assert key in names, f"unknown {cat} key {key}"
                tenure[key] = tenure.get(key, 0) + 1
                mom, move = momentum(rank, prev_ranks.get(key), key in seen)
                seen.add(key)
                if ev is None:
                    ev = DEFAULT_EV[move] if not (rank == 1 and move == "=") \
                        else "Holds #1"
                entries.append({"key": key, "rank": rank, "ev": ev,
                                "scores": seed_scores(cat, rank, mom, tenure[key])})
            calibrate(entries, weights)
            for e in entries:
                composite = round(sum(weights[c] * e["scores"][c] for c in weights), 3)
                con.execute(
                    f"INSERT INTO {rankings}(year, rank, key, label, evidence, score)"
                    " VALUES (?, ?, ?, ?, ?, ?)",
                    (year, e["rank"], e["key"], label_for(cat, e["key"], year, names),
                     e["ev"], composite))
                for c, v in e["scores"].items():
                    con.execute(
                        f"INSERT INTO {scores_t}(year, key, criterion, score)"
                        " VALUES (?, ?, ?, ?)", (year, e["key"], c, v))
            prev_ranks = {e["key"]: e["rank"] for e in entries}

    for year, remark in REMARKS.items():
        con.execute("INSERT INTO timeline(year, remark) VALUES (?, ?)", (year, remark))

    con.commit()
    n_t, = con.execute("SELECT COUNT(*) FROM tool_rankings WHERE year >= 2026").fetchone()
    n_d, = con.execute(
        "SELECT COUNT(*) FROM diagram_rankings WHERE year >= 2026").fetchone()
    con.close()
    print(f"seeded {FIRST}-{LAST}: {n_d} type rows, {n_t} tool rows")


if __name__ == "__main__":
    main()
