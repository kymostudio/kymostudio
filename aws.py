"""AWS reference-architecture replica — Lex chatbot + Bedrock RAG.

Mirrors `references/aws-1.png`. Built to exercise §6.6 (Grid System and
Snap) and §6.7 (Visual Hierarchy and Reading Flow) of
BEST_PRACTICE_DIAGRAMS.md:

  • Every component centre snaps to the 8-pixel grid.
  • Canvas 1280×680 (both dims % 16 == 0).
  • Reading flow L→R: customer → inner app → AWS services.
  • Visual hierarchy: AWS Lambda is the orchestrator, rendered as
    `aws-tile-hero` (+25 % over peer tiles).
  • Numbered step badges ①②③ on the primary request path.
  • Two-tier grouping: outer `us-east-1` Region (navy dashed, admin
    boundary, AWS-logo badge) + inner `<your-company>.com` Container
    (purple dashed, logical subgroup, site-globe badge).
  • Lambda fan-out (DynamoDB/Bedrock/Kendra) drawn DASHED to indicate
    async / parallel invocation, matching the reference.

Render with:
    uv run generate.py aws
"""
from model import Component, Diagram, Edge, Region


# ── Components ─────────────────────────────────────────────────────────
# All positions snap to 8 px (§6.6.2). Lambda is the HERO (§6.7.2).
COMPONENTS = [
    # ── Actors outside AWS ───────────────────────────────────────────
    Component("customer", "Customer", "",
              icon="customer-person", shape="circle",  accent="blue",
              pos=(72, 344)),
    Component("internet", "Internet", "",
              icon="internet-cloud",  shape="circle",  accent="blue",
              pos=(1200, 424)),

    # ── Inside <your-company>.com container ──────────────────────────
    Component("amplify", "AWS Amplify", "Website",
              icon="aws-amplify", shape="aws-tile",      accent="orange",
              pos=(320, 176)),
    Component("lex", "Amazon Lex", "Natural Language Chatbot",
              icon="aws-lex",     shape="aws-tile",      accent="orange",
              pos=(320, 344)),
    Component("lambda", "AWS Lambda", "Lex Bot Logic Handler",
              icon="aws-lambda",  shape="aws-tile-hero", accent="orange",
              pos=(568, 344)),      # HERO — orchestrator at visual centre
    Component("connect", "Amazon Connect", "Contact Center",
              icon="aws-connect", shape="aws-tile",      accent="orange",
              pos=(448, 512)),

    # ── Inside us-east-1 but outside the inner container ─────────────
    # Matches reference topology: DynamoDB top, Bedrock+S3 paired in mid
    # row (fine-tuning data flow), Kendra at bottom (Web Crawler input).
    Component("dynamodb", "Amazon DynamoDB", "User Account Info",
              icon="aws-dynamodb", shape="aws-tile", accent="blue",
              pos=(832, 176)),
    Component("bedrock", "Amazon Bedrock", "Anthropic Claude 2.1 FM",
              icon="aws-bedrock",  shape="aws-tile", accent="green",
              pos=(832, 344)),
    Component("s3", "Amazon S3", "Customer Data",
              icon="aws-s3",       shape="aws-tile", accent="green",
              pos=(1064, 344)),       # paired with Bedrock, same row
    Component("kendra", "Amazon Kendra", "FAQ Search",
              icon="aws-kendra",   shape="aws-tile", accent="orange",
              pos=(1024, 520)),       # bottom-right, fed by Lambda and Internet

    # ── Slack badge beside Connect (icon-only annotation) ────────────
    Component("slack", "", "",
              icon="slack", shape="badge", accent="blue",
              pos=(560, 512)),

    # ── Numbered step badges (§6.7.3) ────────────────────────────────
    Component("step1", "", "", icon="step-1", shape="badge", accent="orange",
              pos=(184, 296)),
    Component("step2", "", "", icon="step-2", shape="badge", accent="orange",
              pos=(440, 160)),
    Component("step3", "", "", icon="step-3", shape="badge", accent="orange",
              pos=(704, 160)),
]


# ── Regions ────────────────────────────────────────────────────────────
# Outer = administrative boundary (AWS region, navy). Inner = logical
# subgroup (the company's app domain, purple). See §6.7.4.
REGIONS = [
    Region("us-east-1", "us-east-1",
           contains=["amplify", "lex", "lambda", "connect",
                     "dynamodb", "bedrock", "s3", "kendra"],
           padding=(40, 56),
           style="outer",
           icon="aws-logo"),
    Region("your-company", "<your-company>.com",
           contains=["amplify", "lex", "lambda", "connect"],
           padding=(24, 24),
           style="inner",
           icon="site-globe"),
]


# Auto-layout is bypassed — all positions are absolute, per AIQ pattern.
LAYOUT = None


# ── Edges ──────────────────────────────────────────────────────────────
# Three customer-entry channels (Web/SMS/Voice) all originate from the
# Customer's right edge with vertical offsets — keeps each label distinct
# and prevents the lines from overlapping at the start.
EDGES = [
    # ── Customer → entry channels ──────────────────────────────────
    Edge("customer", "amplify", "Web",
         src_anchor="right", dst_anchor="left",
         src_offset=(0, -24),
         label_offset=(-40, -8), label_small=True),

    Edge("customer", "lex", "SMS",
         src_anchor="right", dst_anchor="left",
         label_offset=(-50, -8), label_small=True),

    Edge("customer", "connect", "Voice",
         src_anchor="bottom", dst_anchor="left",
         via=[(72, 512)],
         label_pos=(232, 504), label_small=True),

    # ── Main numbered flow: Amplify → Lambda → DynamoDB ────────────
    Edge("amplify", "lambda", "",
         src_anchor="right", dst_anchor="left"),

    # Lambda → DynamoDB is part of the request flow, but is also one of
    # the Lambda fan-outs to data services — draw dashed.
    Edge("lambda", "dynamodb", "",
         src_anchor="top", dst_anchor="left",
         dashed=True),

    # ── Lex ↔ Lambda (bidirectional, parallel rails) ───────────────
    Edge("lex", "lambda", "",
         src_anchor="right", dst_anchor="left",
         src_offset=(0, -12), dst_offset=(0, -12)),
    Edge("lambda", "lex", "",
         src_anchor="left",  dst_anchor="right",
         src_offset=(0,  12), dst_offset=(0,  12)),

    # ── Lambda fan-out to data services (dashed = async/parallel) ──
    Edge("lambda", "bedrock", "",
         src_anchor="right", dst_anchor="left",
         dashed=True),

    # ── Bedrock → S3 (fine-tuning data, solid — direct dependency) ──
    Edge("bedrock", "s3", "fine-tunable",
         src_anchor="right", dst_anchor="left",
         label_offset=(0, -10), label_small=True),

    # ── Lambda → Kendra (fan-out to FAQ search) ────────────────────
    Edge("lambda", "kendra", "",
         src_anchor="bottom", dst_anchor="left",
         via=[(568, 520)],
         dashed=True),

    # ── Internet → Kendra (Web Crawler from outside) ───────────────
    Edge("internet", "kendra", "Web Crawler",
         src_anchor="bottom", dst_anchor="right",
         via=[(1200, 520)],
         label_pos=(1136, 512), label_small=True),

    # ── Connect → Lambda (Voice channel meets Lex logic) ───────────
    Edge("connect", "lambda", "",
         src_anchor="top",   dst_anchor="bottom"),
]


# ── Diagram (canvas dims % 16 == 0, per §6.6.4) ───────────────────────
DIAGRAM = Diagram(
    width=1280,
    height=680,
    components=COMPONENTS,
    regions=REGIONS,
    edges=EDGES,
)
