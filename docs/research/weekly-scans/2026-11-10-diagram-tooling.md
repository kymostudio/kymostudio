# Weekly scan 2026-11-10 — diagram tooling (BLOCKED: chỉ có shortlist)

## Executive summary
- Run này **không hoàn thành deep-dive**: session chỉ được cấp quyền đọc repo `kymostudio/kymostudio`; mọi `gh api repos/<other>` và đọc README/source đều trả 403 "GitHub access ... not enabled". Chỉ `gh api search/*` hoạt động.
- Theo quy tắc "không bịa evidence", §2–§4 (kiến trúc, diagram, verdict) **không được viết**; dưới đây chỉ là shortlist từ search metadata.
- Cần: cấp quyền đọc các repo bên dưới (hoặc nới scope), rồi chạy lại.

## Mục lục
1. Shortlist ứng viên
2. Việc cần làm tiếp

## 1. Shortlist ứng viên (metadata từ search, chưa đọc code)
| Repo | ★ | Lang | Mô tả (từ GitHub) | Vì sao đáng đọc |
|---|---|---|---|---|
| HoangYell/markdy-com | 105 | TS | Animated architecture diagrams as code, DSL riêng, 17 layout engines, Web Animations API, MCP server | Gần kymo nhất: DSL + animation + nhiều layout |
| reladraw/reladraw | 1174 | TS | Text diagram language "nói rõ đặt ở đâu" (relative placement) | Ý tưởng DSL relative-position, so với alignment resolver của kymo |
| wevm/ondine | 446 | Rust | "Fast and simple diagrams" (repo mới ≤30 ngày) | Rust diagram engine, so với `kymostudio-core` |
| awslabs/diagram-as-code | 1596 | Go | AWS architecture diagram-as-code | YAML-based, icon/AWS preset |
| swiftlysingh/excalidraw-cli | 318 | TS | Text/JSON → Excalidraw cho agents | Cross-format, so với `to_excalidraw.py` |
| bassnova42/arch-diagram-skill | 121 | JS | Skill → animated architecture diagram (HTML/PNG/MP4/GIF/Mermaid) | Animation output pipeline |

Loại: stack-diagram, homelab-*, design-agent (skill/app, không phải engine); networkx, plantuml/plantuml (không mới/notable trong tuần chưa kiểm tra release).

## 2. Việc cần làm tiếp
- Cấp access đọc các repo trên → chạy lại để viết đủ §1–§4 cho tối đa 4 repo (ưu tiên markdy-com, reladraw, ondine, excalidraw-cli).
- Bước 3 fallback (release mermaid/d2/plantuml/elkjs...) chưa chạy vì cũng cần đọc repo ngoài scope.
