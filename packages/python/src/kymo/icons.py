"""SVG icon library.

Each icon is an SVG fragment centered at (0, 0). The renderer places it
inside a `<g transform="translate(cx, cy)">` group.

Cubes use an isometric projection. Inner glyphs are positioned in unit-square
[0, 1]² coordinate space on the FRONT FACE — the `_cube()` wrapper applies
a matrix transform that maps that unit square onto the slanted parallelogram,
so the glyphs sit ON the face with the right perspective. Use
`vector-effect="non-scaling-stroke"` to keep stroke widths constant.
"""
from __future__ import annotations


# ── Isometric cube template ────────────────────────────────────────────
def _r(x: float) -> str:
    """Round float to 2 decimals, drop trailing zeros — keeps SVG tidy."""
    return f"{x:.2f}".rstrip("0").rstrip(".")


def _cube(inner_unit: str, size: int = 80) -> str:
    """Green isometric cube of `size` pixels with subtle gradient faces.

    Front face is a parallelogram:
        top-left  (s·0.06, s·0.28)   top-right (s/2,    s·0.49)
        bot-left  (s·0.06, s·0.72)   bot-right (s/2,    s·0.94)

    Inner glyphs are authored in [0,1]² and mapped onto the front face by a
    2D affine matrix:  x' = 0.44s·u + 0.06s,  y' = 0.21s·u + 0.44s·v + 0.28s.
    """
    s = size
    h = s // 2
    a = _r(s * 0.44)
    b = _r(s * 0.21)
    d = _r(s * 0.44)
    e = _r(s * 0.06)
    f = _r(s * 0.28)
    # Face vertices (rounded for tidy output)
    p = {k: _r(s * v) for k, v in [
        ("06", 0.06), ("28", 0.28), ("49", 0.49), ("72", 0.72),
        ("94", 0.94), ("50", 0.50),
    ]}
    return (
      f'<g class="icon-shadow" transform="translate(-{h},-{h})">'
        # top face (rhombus)
        f'<polygon points="{p["50"]},{p["06"]} {p["94"]},{p["28"]} {p["50"]},{p["49"]} {p["06"]},{p["28"]}" '
        f'fill="url(#g-face-top)" stroke="#3d5d00" stroke-width="1"/>'
        # right face
        f'<polygon points="{p["50"]},{p["49"]} {p["94"]},{p["28"]} {p["94"]},{p["72"]} {p["50"]},{p["94"]}" '
        f'fill="url(#g-face-side)" stroke="#3d5d00" stroke-width="1"/>'
        # front face
        f'<polygon points="{p["06"]},{p["28"]} {p["50"]},{p["49"]} {p["50"]},{p["94"]} {p["06"]},{p["72"]}" '
        f'fill="url(#g-face-front)" stroke="#3d5d00" stroke-width="1"/>'
        # inner glyph in unit space, mapped to front face
        f'<g transform="matrix({a},{b},0,{d},{e},{f})" stroke-linejoin="round">{inner_unit}</g>'
      f'</g>'
    )


# Inner glyphs — coordinates in unit space [0, 1]² on the front face.
# Stroke widths are in UNIT space too — they scale with the matrix, so
# choose values that yield ~1.5–2 px lines on screen (matrix scale ≈ 35–44).
_NOTEBOOK_GLYPH = """
  <g stroke="white" stroke-width="0.045" stroke-linecap="round" fill="none">
    <line x1="0.18" y1="0.32" x2="0.82" y2="0.32"/>
    <line x1="0.18" y1="0.52" x2="0.82" y2="0.52"/>
    <line x1="0.18" y1="0.72" x2="0.60" y2="0.72"/>
  </g>
"""

_DOCKER_GLYPH = """
  <g fill="white">
    <rect x="0.10" y="0.30" width="0.34" height="0.18"/>
    <rect x="0.56" y="0.30" width="0.34" height="0.18"/>
    <rect x="0.10" y="0.56" width="0.34" height="0.18"/>
    <rect x="0.56" y="0.56" width="0.34" height="0.18"/>
  </g>
"""

_NEURAL_GLYPH = """
  <g stroke="white" stroke-width="0.032" fill="white">
    <line x1="0.50" y1="0.50" x2="0.20" y2="0.22"/>
    <line x1="0.50" y1="0.50" x2="0.80" y2="0.22"/>
    <line x1="0.50" y1="0.50" x2="0.20" y2="0.78"/>
    <line x1="0.50" y1="0.50" x2="0.80" y2="0.78"/>
    <circle cx="0.50" cy="0.50" r="0.085"/>
    <circle cx="0.20" cy="0.22" r="0.055"/>
    <circle cx="0.80" cy="0.22" r="0.055"/>
    <circle cx="0.20" cy="0.78" r="0.055"/>
    <circle cx="0.80" cy="0.78" r="0.055"/>
  </g>
"""


# ── Flat orange box (data / external) ──────────────────────────────────
def _box(inner: str) -> str:
    return (
      f'<g class="icon-shadow">'
        f'<rect x="-35" y="-35" width="70" height="70" rx="8" '
        f'fill="url(#g-box-orange)" stroke="#c2410c" stroke-width="1.5"/>'
        f'{inner}'
      f'</g>'
    )


_SEND_GLYPH = """
  <g transform="translate(-13, -13)">
    <line x1="28" y1="2" x2="13" y2="17" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    <polygon points="28,2 21,28 13,17 2,11 28,2" fill="white" stroke="white" stroke-width="1.2" stroke-linejoin="round"/>
  </g>
"""

_ZAP_GLYPH = """
  <polygon points="2,-18 -12,4 -1,4 -3,18 11,-4 0,-4 2,-18" fill="white" stroke="white" stroke-width="1.2" stroke-linejoin="round"/>
"""

_ARCHIVE_GLYPH = """
  <g transform="translate(0,-2)">
    <rect x="-20" y="-15" width="40" height="9" rx="2" fill="white"/>
    <path d="M -16,-6 V 16 a 2,2 0 0 0 2,2 H 14 a 2,2 0 0 0 2,-2 V -6" fill="none" stroke="white" stroke-width="2" stroke-linejoin="round"/>
    <line x1="-6" y1="3" x2="6" y2="3" stroke="white" stroke-width="2" stroke-linecap="round"/>
  </g>
"""

_CLOUD_GLYPH = """
  <path d="M -10,12 a 12,12 0 1 1 5,-23 a 16,16 0 0 1 22,15 a 9,9 0 0 1 -2,17 H -10 a 9,9 0 0 1 0,-9 z"
        fill="white" stroke="white" stroke-width="1" stroke-linejoin="round"/>
"""


# ── Other shapes ───────────────────────────────────────────────────────
_USER_CIRCLE = """
  <g class="icon-shadow">
    <circle r="38" fill="url(#g-user-blue)"/>
    <circle cy="-9" r="10" fill="white"/>
    <path d="M -18,20 a 18,14 0 0 1 36,0 z" fill="white"/>
  </g>
"""

_CYLINDER = """
  <g class="icon-shadow" transform="translate(-35, -35)">
    <ellipse cx="35" cy="12" rx="28" ry="8" fill="#fdba74" stroke="#c2410c" stroke-width="1.4"/>
    <path d="M 7,12 V 58 a 28,8 0 0 0 56,0 V 12" fill="url(#g-cyl-orange)" stroke="#c2410c" stroke-width="1.4"/>
    <ellipse cx="35" cy="12" rx="28" ry="8" fill="none" stroke="#c2410c" stroke-width="1.2"/>
    <path d="M 7,28 a 28,8 0 0 0 56,0" fill="none" stroke="#c2410c" stroke-width="0.8" opacity="0.55"/>
    <path d="M 7,42 a 28,8 0 0 0 56,0" fill="none" stroke="#c2410c" stroke-width="0.8" opacity="0.55"/>
  </g>
"""

_KEY = """
  <g stroke="#d97706" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="-10" cy="0" r="6" fill="#fff4e0"/>
    <line x1="-4" y1="-2" x2="16" y2="-2"/>
    <line x1="10" y1="-2" x2="10" y2="3"/>
    <line x1="16" y1="-2" x2="16" y2="5"/>
  </g>
"""


# ── Hexagonal "agent" (NVIDIA NeMo style) ─────────────────────────────
# Flat-top hexagon with a stylized character (head + shoulders + glasses-like dots).
# Coordinates are in the icon's local space, centered at (0, 0).
_HEX_AGENT = """
  <g class="icon-shadow">
    <polygon points="-30,-17 0,-32 30,-17 30,17 0,32 -30,17"
             fill="#e9f5d0" stroke="#3d5d00" stroke-width="1.6"/>
    <!-- head -->
    <circle cx="0" cy="-7" r="6.5" fill="#76b900"/>
    <!-- glasses: two dots + bridge -->
    <circle cx="-2.5" cy="-7" r="1" fill="#e9f5d0"/>
    <circle cx="2.5" cy="-7" r="1" fill="#e9f5d0"/>
    <!-- body / shoulders -->
    <path d="M -14,18 Q -14,4 0,4 Q 14,4 14,18 Z" fill="#76b900"/>
    <!-- collar V -->
    <path d="M -4,6 L 0,12 L 4,6" fill="#e9f5d0" stroke="none"/>
  </g>
"""



# ── Other AIQ-specific glyphs (used inside orange boxes) ──────────────
_GEAR_GLYPH = """
  <g fill="white" stroke="white" stroke-width="1.4" stroke-linejoin="round">
    <path d="M 0,-15 L 4,-15 L 5,-11 L 9,-9 L 12,-12 L 15,-9 L 12,-6 L 14,-2 L 18,-1 L 18,3
             L 14,4 L 12,8 L 15,11 L 12,14 L 9,11 L 5,13 L 4,17 L 0,17 L -1,13 L -5,11
             L -8,14 L -11,11 L -8,8 L -10,4 L -14,3 L -14,-1 L -10,-2 L -8,-6 L -11,-9
             L -8,-12 L -5,-9 L -1,-11 L 0,-15 Z"
          transform="translate(2, -2) scale(0.85)"/>
    <circle cx="2" cy="-2" r="4" fill="#f59e0b" stroke="#f59e0b"/>
  </g>
"""

_FOLDER_GLYPH = """
  <g fill="white" stroke="white" stroke-width="1.2" stroke-linejoin="round">
    <path d="M -22,-12 L -8,-12 L -4,-7 L 22,-7 L 22,16 L -22,16 Z"/>
  </g>
"""

_FILES_STACK = """
  <g fill="white" stroke="white" stroke-width="1.2" stroke-linejoin="round">
    <!-- back document -->
    <rect x="-18" y="-18" width="20" height="26" rx="2" fill="white" opacity="0.6"/>
    <!-- front document -->
    <rect x="-8" y="-8" width="22" height="28" rx="2" fill="white"/>
    <line x1="-3" y1="-1" x2="10" y2="-1" stroke="#d97706" stroke-width="1.2"/>
    <line x1="-3" y1="4"  x2="10" y2="4"  stroke="#d97706" stroke-width="1.2"/>
    <line x1="-3" y1="9"  x2="6"  y2="9"  stroke="#d97706" stroke-width="1.2"/>
  </g>
"""

_CHECKLIST_GLYPH = """
  <g stroke="#94a3b8" fill="white" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
    <rect x="-22" y="-22" width="44" height="44" rx="2" fill="white"/>
    <!-- 3 rows of checkbox + line -->
    <polyline points="-15,-14 -12,-11 -8,-16" fill="none" stroke="#475569" stroke-width="2"/>
    <line x1="-4" y1="-13" x2="14" y2="-13" stroke="#94a3b8"/>
    <polyline points="-15,-2 -12,1 -8,-4" fill="none" stroke="#475569" stroke-width="2"/>
    <line x1="-4" y1="-1" x2="14" y2="-1" stroke="#94a3b8"/>
    <polyline points="-15,10 -12,13 -8,8" fill="none" stroke="#475569" stroke-width="2"/>
    <line x1="-4" y1="11" x2="14" y2="11" stroke="#94a3b8"/>
  </g>
"""

_MAGNIFIER_GLYPH = """
  <g fill="none" stroke="white" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
    <circle cx="-3" cy="-3" r="11" fill="white" stroke="white" stroke-width="0"/>
    <circle cx="-3" cy="-3" r="9" fill="none" stroke="#f59e0b" stroke-width="3"/>
    <line x1="5" y1="5" x2="14" y2="14" stroke="white" stroke-width="4"/>
  </g>
"""

# Generic neural-cube hub (matches NeMo retriever style — green cube with
# small hexagonal "AI" pattern on face)
_HEX_NET_GLYPH = """
  <g stroke="white" stroke-width="0.04" fill="white">
    <!-- 6 connection lines + 6 nodes for a network pattern -->
    <line x1="0.50" y1="0.20" x2="0.20" y2="0.50"/>
    <line x1="0.50" y1="0.20" x2="0.80" y2="0.50"/>
    <line x1="0.20" y1="0.50" x2="0.50" y2="0.80"/>
    <line x1="0.80" y1="0.50" x2="0.50" y2="0.80"/>
    <line x1="0.20" y1="0.50" x2="0.80" y2="0.50"/>
    <line x1="0.50" y1="0.20" x2="0.50" y2="0.80"/>
    <circle cx="0.50" cy="0.20" r="0.055"/>
    <circle cx="0.20" cy="0.50" r="0.055"/>
    <circle cx="0.80" cy="0.50" r="0.055"/>
    <circle cx="0.50" cy="0.80" r="0.055"/>
  </g>
"""


# ── Halo wrapper (for the in-scope "hero" service) ─────────────────────
def _halo(inner: str, size: int = 124) -> str:
    s = size // 2
    return (
      f'<circle r="{s}" fill="#76b900" opacity="0.10"/>'
      f'<circle r="{s-6}" fill="#76b900" opacity="0.08"/>'
      f'{inner}'
    )


# ── AWS-style coloured tile (rounded square, white glyph inside) ──────
# Colours follow AWS service-category palette. Hero variant is +25% size.
def _aws_tile(color: str, dark: str, glyph: str, hero: bool = False) -> str:
    size = 80 if hero else 64
    h = size // 2
    return (
      f'<g class="icon-shadow">'
        f'<rect x="-{h}" y="-{h}" width="{size}" height="{size}" rx="10" '
        f'fill="{color}" stroke="{dark}" stroke-width="1.4"/>'
        f'{glyph}'
      f'</g>'
    )


# White glyphs sit inside the tile (already centred at 0,0). Strokes ~2 px.
_AMPLIFY_GLYPH = """
  <g fill="white" stroke="none">
    <!-- stylized A (Amplify mark) -->
    <path d="M -14,12 L -3,-12 L 3,-12 L 14,12 L 7,12 L 4,5 L -4,5 L -7,12 Z"/>
    <path d="M -1,-1 L 1,-1 L 2,2 L -2,2 Z"/>
  </g>
"""

_LEX_GLYPH = """
  <g fill="white" stroke="none">
    <!-- chat bubble + dots -->
    <path d="M -14,-8 a 4,4 0 0 1 4,-4 H 10 a 4,4 0 0 1 4,4 V 4 a 4,4 0 0 1 -4,4 H -2 L -8,14 V 8 H -10 a 4,4 0 0 1 -4,-4 Z"/>
    <circle cx="-6" cy="-2" r="1.6" fill="#C925D1"/>
    <circle cx="0"  cy="-2" r="1.6" fill="#C925D1"/>
    <circle cx="6"  cy="-2" r="1.6" fill="#C925D1"/>
  </g>
"""

_LAMBDA_GLYPH = """
  <text x="0" y="11" text-anchor="middle"
        style="font-size:38px;font-weight:700;fill:white;font-family:Georgia,serif">&#955;</text>
"""

_CONNECT_GLYPH = """
  <g fill="white" stroke="none">
    <!-- phone handset -->
    <path d="M -12,-8 q 0,-4 4,-4 l 4,0 q 3,0 4,3 l 1,4 q 1,3 -2,5 l -3,2 q 3,6 9,9 l 2,-3 q 2,-3 5,-2 l 4,1 q 3,1 3,4 l 0,4 q 0,4 -4,4 q -16,0 -27,-11 q -11,-11 -11,-16 z"/>
  </g>
"""

_DYNAMODB_GLYPH = """
  <g fill="white" stroke="white" stroke-width="0" stroke-linejoin="round">
    <!-- stacked database discs -->
    <ellipse cx="0" cy="-9" rx="12" ry="3.5"/>
    <path d="M -12,-9 V -1 a 12,3.5 0 0 0 24,0 V -9" fill="white"/>
    <ellipse cx="0" cy="-1" rx="12" ry="3.5" fill="#4D72F3" opacity="0.35"/>
    <path d="M -12,0 V 8 a 12,3.5 0 0 0 24,0 V 0" fill="white"/>
    <ellipse cx="0" cy="8" rx="12" ry="3.5" fill="#4D72F3" opacity="0.35"/>
    <path d="M -12,9 V 12 a 12,3.5 0 0 0 24,0 V 9" fill="white"/>
  </g>
"""

_BEDROCK_GLYPH = """
  <g fill="white" stroke="white" stroke-width="1.6" stroke-linecap="round">
    <!-- brain-ish network -->
    <circle cx="0"   cy="0"  r="3.5" fill="white"/>
    <circle cx="-10" cy="-7" r="2.5" fill="white"/>
    <circle cx="10"  cy="-7" r="2.5" fill="white"/>
    <circle cx="-10" cy="7"  r="2.5" fill="white"/>
    <circle cx="10"  cy="7"  r="2.5" fill="white"/>
    <line x1="-7" y1="-5" x2="-2" y2="-1"/>
    <line x1="7"  y1="-5" x2="2"  y2="-1"/>
    <line x1="-7" y1="5"  x2="-2" y2="1"/>
    <line x1="7"  y1="5"  x2="2"  y2="1"/>
  </g>
"""

_S3_GLYPH = """
  <g fill="white" stroke="none">
    <!-- bucket -->
    <path d="M -12,-8 L 12,-8 L 10,12 a 2,2 0 0 1 -2,2 L -8,14 a 2,2 0 0 1 -2,-2 Z"/>
    <ellipse cx="0" cy="-8" rx="12" ry="3" fill="#7AA116"/>
    <ellipse cx="0" cy="-8" rx="12" ry="3" fill="none" stroke="white" stroke-width="1.2"/>
  </g>
"""

_KENDRA_GLYPH = """
  <g fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round">
    <!-- magnifier -->
    <circle cx="-3" cy="-3" r="8"/>
    <line x1="3" y1="3" x2="11" y2="11"/>
  </g>
"""


# ── Customer / Internet (outside-the-cloud actors) ────────────────────
_CUSTOMER_PERSON = """
  <g class="icon-shadow">
    <circle r="34" fill="url(#g-user-blue)"/>
    <circle cy="-8" r="9" fill="white"/>
    <path d="M -16,18 a 16,12 0 0 1 32,0 z" fill="white"/>
  </g>
"""

_INTERNET_CLOUD = """
  <g class="icon-shadow">
    <path d="M -22,8 a 14,14 0 1 1 6,-26 a 18,18 0 0 1 26,16 a 11,11 0 0 1 -3,21 H -22 a 11,11 0 0 1 -7,-11 z"
          fill="#dbeafe" stroke="#1d4ed8" stroke-width="1.6" stroke-linejoin="round"/>
    <text x="0" y="6" text-anchor="middle"
          style="font-size:9.5px;font-weight:700;fill:#1d4ed8;letter-spacing:0.05em">WWW</text>
  </g>
"""


# ── Slack badge (annotation for Connect) ──────────────────────────────
_SLACK_BADGE = """
  <g class="icon-shadow">
    <rect x="-16" y="-16" width="32" height="32" rx="7" fill="white" stroke="#cbd5e1" stroke-width="1"/>
    <!-- Slack hash mark, 4 coloured arms -->
    <g stroke-linecap="round" stroke-width="3.6" fill="none">
      <line x1="-7" y1="-3" x2="7"  y2="-3" stroke="#e01e5a"/>
      <line x1="-7" y1="3"  x2="7"  y2="3"  stroke="#36c5f0"/>
      <line x1="-3" y1="-7" x2="-3" y2="7"  stroke="#2eb67d"/>
      <line x1="3"  y1="-7" x2="3"  y2="7"  stroke="#ecb22e"/>
    </g>
  </g>
"""

# Plus-sign junction marker (used between Connect+Slack, Lambda fan-outs, etc.)
_PLUS_MARK = """
  <g fill="#475569" stroke="#475569" stroke-width="2" stroke-linecap="round">
    <line x1="-6" y1="0" x2="6" y2="0"/>
    <line x1="0" y1="-6" x2="0" y2="6"/>
  </g>
"""


# ── Region top-left badges (§6.7.4) ───────────────────────────────────
# Drawn centred at (0, 0); placed at top-left of region rect by renderer.
_AWS_LOGO = """
  <g class="icon-shadow">
    <rect x="-18" y="-18" width="36" height="36" rx="4" fill="#232f3e"/>
    <text x="0" y="2" text-anchor="middle"
          style="font-size:14px;font-weight:800;fill:white;font-family:Arial,Helvetica,sans-serif;letter-spacing:-0.4px">aws</text>
    <path d="M -9,8 Q 0,13 9,8" fill="none" stroke="#ff9900" stroke-width="1.8" stroke-linecap="round"/>
  </g>
"""

_SITE_GLOBE = """
  <g fill="none" stroke="#475569" stroke-width="1.4" stroke-linecap="round">
    <circle r="9"/>
    <ellipse cx="0" cy="0" rx="4" ry="9"/>
    <line x1="-9" y1="0" x2="9" y2="0"/>
  </g>
"""


# ── Numbered step badge (§6.7.3) ──────────────────────────────────────
def _step_badge(n: int) -> str:
    return (
      f'<circle r="14" fill="#fff4e0" stroke="#d97706" stroke-width="1.8"/>'
      f'<text x="0" y="4.5" text-anchor="middle" '
      f'style="font-size:14px;font-weight:700;fill:#92400e">{n}</text>'
    )


# ── Public registry ─────────────────────────────────────────────────────
ICONS: dict[str, str] = {
    "user":      _USER_CIRCLE,
    "notebook":  _cube(_NOTEBOOK_GLYPH),
    "boxes":     _cube(_DOCKER_GLYPH),
    "neural":    _halo(_cube(_NEURAL_GLYPH, size=100)),
    "neural-sm": _cube(_HEX_NET_GLYPH),         # smaller neural-pattern cube for NeMo retrievers
    "send":      _box(_SEND_GLYPH),
    "zap":       _box(_ZAP_GLYPH),
    "archive":   _box(_ARCHIVE_GLYPH),
    "cloud":     _box(_CLOUD_GLYPH),
    "cylinder":  _CYLINDER,
    "key":       _KEY,
    # AIQ replica icons:
    "hex-agent":     _HEX_AGENT,
    "gear":      _box(_GEAR_GLYPH),
    "folder":    _box(_FOLDER_GLYPH),
    "files":     _box(_FILES_STACK),
    "checklist": _box(_CHECKLIST_GLYPH),
    "magnifier": _box(_MAGNIFIER_GLYPH),
    # AWS replica icons (tile colour ≈ AWS service-category palette):
    "aws-amplify":  _aws_tile("#DD344C", "#a31836", _AMPLIFY_GLYPH),
    "aws-lex":      _aws_tile("#C925D1", "#8a1690", _LEX_GLYPH),
    "aws-lambda":   _aws_tile("#ED7100", "#a44a00", _LAMBDA_GLYPH, hero=True),
    "aws-connect":  _aws_tile("#DD344C", "#a31836", _CONNECT_GLYPH),
    "aws-dynamodb": _aws_tile("#4D72F3", "#2a4ec2", _DYNAMODB_GLYPH),
    "aws-bedrock":  _aws_tile("#01A88D", "#017364", _BEDROCK_GLYPH),
    "aws-s3":       _aws_tile("#7AA116", "#506b0e", _S3_GLYPH),
    "aws-kendra":   _aws_tile("#C925D1", "#8a1690", _KENDRA_GLYPH),
    "customer-person": _CUSTOMER_PERSON,
    "internet-cloud":  _INTERNET_CLOUD,
    "step-1":     _step_badge(1),
    "step-2":     _step_badge(2),
    "step-3":     _step_badge(3),
    # Region top-left badges (§6.7.4):
    "aws-logo":    _AWS_LOGO,
    "site-globe":  _SITE_GLOBE,
    # Annotations:
    "slack":       _SLACK_BADGE,
    "plus":        _PLUS_MARK,
}


# ── File-backed icons (icons/ folder, lazy-loaded) ─────────────────────
# At import we only catalogue paths (cheap rglob) — base64-encoding 2000+
# PNGs eagerly would burn seconds of startup. The first call to
# `get_icon(key)` loads + encodes the requested file and caches the
# result back into ICONS, so subsequent lookups are dict-hits.
#
# Key convention: `icons/<provider>/<category>/<name>.<ext>` → key
# `<provider>-<name>` (drop the category, which is just a filesystem
# grouping). Last-write-wins on collisions; pick filenames carefully if
# this matters.
import base64
from pathlib import Path


# Repo-root `icons/` is shared by both packages and lives outside this
# package. In the dev tree it sits 4 levels up from this file
# (packages/python/src/kymo/icons.py → repo root). When kymo is pip-installed
# the folder is absent, so `_scan_icons_dir()` finds nothing and only the
# hand-coded ICONS above are available — file-backed icons are a dev-tree
# (and static-host) convenience.
_ICONS_DIR = Path(__file__).resolve().parents[4] / "icons"
_IMAGE_SIZE = 64
_FILE_ICONS: dict[str, Path] = {}


def _png_as_image_tag(path: Path, size: int = _IMAGE_SIZE) -> str:
    """Wrap a PNG file as an SVG `<image>` tag, centered at (0, 0)."""
    data = base64.b64encode(path.read_bytes()).decode("ascii")
    half = size // 2
    return (
        f'<image href="data:image/png;base64,{data}" '
        f'x="-{half}" y="-{half}" width="{size}" height="{size}"/>'
    )


def _svg_as_inline(path: Path, size: int = _IMAGE_SIZE) -> str:
    """Inline an SVG file scaled to `size`×`size` centered at (0, 0)."""
    raw = path.read_text(encoding="utf-8")
    half = size // 2
    return (
        f'<svg x="-{half}" y="-{half}" width="{size}" height="{size}" '
        f'overflow="visible">{raw}</svg>'
    )


def _scan_icons_dir() -> None:
    """Catalogue file paths only — no I/O on file contents until first use."""
    if not _ICONS_DIR.exists():
        return
    for path in sorted(_ICONS_DIR.rglob("*")):
        if not path.is_file() or path.suffix.lower() not in (".png", ".svg"):
            continue
        parts = path.relative_to(_ICONS_DIR).with_suffix("").parts
        key = f"{parts[0]}-{parts[-1]}" if len(parts) > 1 else parts[0]
        _FILE_ICONS[key] = path


def get_icon(key: str) -> str:
    """Return the SVG fragment for `key`. Resolves the hand-coded ICONS
    dict first, then file-backed icons (which are loaded + cached on
    first hit). Raises KeyError if neither registry knows the key."""
    if key in ICONS:
        return ICONS[key]
    if key in _FILE_ICONS:
        path = _FILE_ICONS[key]
        svg = _png_as_image_tag(path) if path.suffix.lower() == ".png" else _svg_as_inline(path)
        ICONS[key] = svg                      # cache for subsequent calls
        return svg
    raise KeyError(f"unknown icon: {key!r}")


_scan_icons_dir()
