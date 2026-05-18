"""Minimal AWS-region demo — a single `us-east-1` region with the AWS
logo badge at top-left and three services inside.

Demonstrates in isolation:
  • Region.icon (`aws-logo` at top-left, label `us-east-1` beside it)
  • aws-tile components on the 8-px grid
  • auto-bounded region (`contains=[…]` + padding) — no manual bounds

Render with:
    uv run generate.py aws-region
"""
from model import Component, Diagram, Region


# ── Components (3 services on the 8-px grid) ───────────────────────────
COMPONENTS = [
    Component("lambda", "AWS Lambda", "Compute",
              icon="aws-lambda",   shape="aws-tile-hero", accent="orange",
              pos=(200, 192)),
    Component("dynamodb", "Amazon DynamoDB", "Key-value store",
              icon="aws-dynamodb", shape="aws-tile",      accent="blue",
              pos=(440, 192)),
    Component("s3", "Amazon S3", "Object storage",
              icon="aws-s3",       shape="aws-tile",      accent="green",
              pos=(640, 192)),
]


# ── One region, auto-bounded, with the AWS badge at top-left ───────────
REGIONS = [
    Region("us-east-1", "us-east-1",
           contains=["lambda", "dynamodb", "s3"],
           padding=(48, 56),
           style="outer",
           icon="aws-logo"),
]


# Hand-placed (no auto-layout sweep).
LAYOUT = None

# No edges in this minimal demo — just the region + services.
EDGES = []


# ── Canvas dims % 16 == 0 per §6.6.4 ───────────────────────────────────
DIAGRAM = Diagram(
    width=800,
    height=400,
    components=COMPONENTS,
    regions=REGIONS,
    edges=EDGES,
)
