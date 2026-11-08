# Weekly scan 2026-11-08 — diagram tooling (BLOCKED: chỉ có candidate list)

## Executive summary
- Run này **không hoàn thành phần deep-dive**: GitHub access của session chỉ được scope vào `kymostudio/kymostudio`; đọc README/source của repo ngoài scope bị từ chối (HTTP 403), nên §1–§4 không thể viết mà không bịa.
- Search metadata (cho phép) cho thấy 4 candidate đáng đọc ở lần chạy có quyền.
- Cần cấp thêm quyền read cho các repo dưới đây (hoặc nới scope của routine) rồi chạy lại.

## Candidates (từ `search/repositories`, pushed trong 7 ngày, chỉ metadata)
| Repo | Stars | Lang | Mô tả (từ GitHub) | Vì sao đáng đọc |
|---|---|---|---|---|
| reladraw/reladraw | ~1172 | TypeScript | Text diagram language "say where things go" | Novel DSL — relative placement thay vì auto-layout; liên quan alignment resolver của kymo |
| HoangYell/markdy-com | ~105 | TypeScript | Animated architecture diagrams as code, 17 layout engines, Web Animations API, MCP server | Animation + nhiều layout engine + MCP; gần hướng kymo nhất |
| hikerpig/pintora | ~1282 | TypeScript | Extensible text-to-diagrams library (browser + node) | Kiến trúc plugin diagram type, so sánh với emitter pattern |
| wevm/ondine | ~447 | Rust | "Fast and simple diagrams" (tạo trong 30 ngày) | Rust diagram engine mới; so với crate `kymostudio` |

Bỏ qua: swiftlysingh/excalidraw-cli (generator, ít novelty), caru-ini/stack-diagram (agent skill), các repo ngoài domain (hypit, networkx, ...).

## Trạng thái §1–§4
Chưa thực hiện cho cả 4 repo — "không xác định" do thiếu quyền đọc source.
