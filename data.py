"""The diagram itself — components, regions, edges, and the layout spec.

Coordinates are NOT set here. Positions are computed by `layout.layout()`
from `LAYOUT` (which region/row each component belongs to). Edit either:
  - `LAYOUT` to rearrange the grid (move a component to a different row/col)
  - the component's `name` / `subtitle` to change labels
  - the `Edge` list to add or rewire connections
"""
from model import Component, Diagram, Edge, Region


# ── Components (positions filled in by layout) ─────────────────────────
COMPONENTS = [
    Component("user",        "Agent / User",     "Bootcamp participant",
              icon="user",     shape="circle",     accent="blue",   pos=(0, 0)),

    Component("jupyter",     "Jupyter Notebook", "Python 3.13  ·  điều phối 2 luồng",
              icon="notebook", shape="cube",       accent="green",  pos=(0, 0)),

    Component("http_client", "HTTP Client",      "requests  →  API Catalog",
              icon="send",     shape="box",        accent="orange", pos=(0, 0)),

    Component("chat_nvidia", "ChatNVIDIA",       "langchain-nvidia  ·  luồng LOCAL",
              icon="zap",      shape="box",        accent="orange", pos=(0, 0)),

    Component("docker",      "Docker Engine",    "daemon  ·  quản lý NIM",
              icon="boxes",    shape="cube",       accent="green",  pos=(0, 0)),

    Component("nim",         "NIM Microservice", "Uvicorn  ·  llama-3.2-3b  ·  :8000",
              icon="neural",   shape="cube-big",   accent="green",  pos=(0, 0)),

    Component("cache",       "NIM Cache",        "~/.cache/nim → /opt/nim/.cache",
              icon="cylinder", shape="cylinder",   accent="orange", pos=(0, 0)),

    Component("nvcr",        "nvcr.io",          "Container Registry",
              icon="archive",  shape="box",        accent="orange", pos=(0, 0)),

    Component("api_catalog", "API Catalog",      "integrate.api.nvidia.com  ←  HTTP",
              icon="cloud",    shape="box",        accent="orange", pos=(0, 0)),

    Component("auth",        "Auth",             "NVIDIA_API_KEY  ·  NGC_API_KEY",
              icon="key",      shape="annotation", accent="orange", pos=(0, 0)),
]


# ── Regions (bounds filled in by layout) ───────────────────────────────
REGIONS = [
    Region("code-server", "code-server (IDE)",     bounds=(0, 0, 0, 0)),
    Region("brev",        "NVIDIA Brev (GPU pod)", bounds=(0, 0, 0, 0)),
    Region("cloud",       "NVIDIA Cloud (SaaS)",   bounds=(0, 0, 0, 0)),
]


# ── Layout spec — which cells go in which region row ───────────────────
# Rows align horizontally ACROSS regions, so cross-region same-row edges
# run straight horizontal. HTTP+Chat side-by-side at row 1 (both are
# alternate clients invoked from Jupyter — visually parallel paths).
LAYOUT = {
    "code-server": [
        ["jupyter"],                     # row 0 — same Y as docker, nvcr (setup path)
        ["http_client", "chat_nvidia"],  # row 1 — same Y as nim, api_catalog (inference)
    ],
    "brev": [
        ["docker"],
        ["nim"],
        ["cache"],
    ],
    "cloud": [
        ["nvcr"],
        ["api_catalog"],
        ["auth"],
    ],
}

# External components placed relative to a target.
EXTERNAL_LAYOUT = {
    "user": {"above": "jupyter", "gap": 32},
}


# ── Edges (mostly auto-routed; only the cloud arc needs a hint) ────────
EDGES = [
    # User → Jupyter (vertical, auto)
    Edge("user", "jupyter", "Mở browser",
         src_anchor="bottom", dst_anchor="top",
         label_offset=(60, -8)),

    # Jupyter → Docker (horizontal same-row, auto)
    Edge("jupyter", "docker", "docker run  ·  SSH",
         src_anchor="right", dst_anchor="left",
         label_offset=(0, -8)),

    # Docker → nvcr.io (horizontal same-row, orange)
    Edge("docker", "nvcr", "Pull image",
         src_anchor="right", dst_anchor="left",
         style="orange", label_offset=(0, -8)),

    # Jupyter → HTTP Client (smooth S-curve, diverges LEFT from Jupyter bottom)
    Edge("jupyter", "http_client", "Cloud cell",
         src_anchor="bottom", dst_anchor="top",
         route="curve", src_offset=(-22, 0),
         label_anchor="dst", label_offset=(0, -14), label_small=True),

    # Jupyter → ChatNVIDIA (smooth S-curve, diverges RIGHT from Jupyter bottom)
    Edge("jupyter", "chat_nvidia", "Local cell",
         src_anchor="bottom", dst_anchor="top",
         route="curve", src_offset=(22, 0),
         label_anchor="dst", label_offset=(0, -14), label_small=True),

    # ChatNVIDIA → NIM (right→left, same row 1, straight horizontal)
    Edge("chat_nvidia", "nim", "POST  ·  local",
         src_anchor="right", dst_anchor="left",
         label_offset=(0, -8), label_small=True),

    # NOTE: HTTP Client → API Catalog cloud-inference call is NOT drawn as
    # an arrow — a single long arc spanning 3 regions would dominate the
    # diagram and break its overall structure (every other arrow is short
    # and local). Instead, the connection is expressed in the components'
    # subtitles ("requests → API Catalog" and "← HTTP") and reinforced by
    # the shared external-orange box styling.

    # Docker → NIM (vertical same-col, auto)
    Edge("docker", "nim", "Khởi tạo pod",
         src_anchor="bottom", dst_anchor="top",
         label_offset=(48, 0), label_small=True),

    # NIM → Cache (vertical same-col, auto)
    Edge("nim", "cache", "Mount weights",
         src_anchor="bottom", dst_anchor="top",
         label_offset=(50, 0), label_small=True),
]


# ── Diagram (width/height also filled in by layout) ────────────────────
DIAGRAM = Diagram(
    width=0, height=0,
    components=COMPONENTS,
    regions=REGIONS,
    edges=EDGES,
)
