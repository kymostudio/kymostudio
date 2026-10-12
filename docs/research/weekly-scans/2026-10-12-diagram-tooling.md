# Weekly scan 2026-10-12 — diagram tooling (BÁO CÁO KHÔNG ĐẦY ĐỦ)

## Executive summary
- **Run bị chặn một phần:** session chỉ có quyền GitHub trên `kymostudio/kymostudio` (không `gh api search/repositories`, không đọc repo ngoài). Chỉ dùng được WebSearch/WebFetch (trang HTML GitHub), nên **không xác minh được `pushed:>7d`** và không đọc được source parser/layout.
- Chỉ 1 repo đọc được tài liệu kiến trúc (OpenFlowKit) — và nó **không chứng minh được** nằm trong cửa sổ 7 ngày. Không đủ 4 repo, theo quy tắc "không bịa" nên không viết bừa.
- Lead đáng theo dõi tuần sau: **Markdy** (MarkdyScript, timeline/beats + Web Animations API, transpiler Mermaid/draw.io/Compose/K8s/Terraform) — chưa tìm được URL repo.

## Mục lục
1. [Ứng viên chưa xác minh](#ứng-viên-chưa-xác-minh)
2. [OpenFlowKit (partial)](#openflowkit-partial)

## Ứng viên chưa xác minh
| Repo | Trạng thái |
|---|---|
| Markdy (markdy-com) | Chỉ có bài báo ([drweb.de](https://www.drweb.de/markdy-animierte-diagramme-als-code/)); `github.com/markdy-com/markdy` trả 404; claim "17 layout engines/MCP" chưa xác minh |
| c4hero | Không tìm thấy nguồn nào |
| flowlab-hq/plein | URL 404 (có thể private); chỉ thấy PR #41 thêm orthogonal routing cho ELK Layered |

## OpenFlowKit (partial)
Nguồn: trang repo + `ARCHITECTURE.md` của Vrun-design/openflowkit. §2 chỉ ghi dimension có evidence.

**§1** — Editor local-first (React Flow) với DSL tương thích Mermaid sync 2 chiều với canvas, export animated WebM/MP4. TS/React 19, XYFlow, Zustand, ELK.js. 848 stars, 172 forks, 222 commits, chưa có release; có Vitest/Playwright/CI. Web app (Docker), có `mcp-server/`.

**§2**
- A. Component: `src/diagram-types/` (plugin theo family: architecture, class, ER, journey, mindmap, state; đăng ký ở `bootstrap.ts`, `builtInPlugins.ts`), `src/services/export/*`, `src/services/mermaid/`, `src/store/createFlowStore.ts`, `src/hooks/useFlowExport.ts`.
- B. Pipeline: không xác định (tài liệu không mô tả parse→layout→render rõ ràng; editor là 4 lớp UI).
- C. IR: không có IR riêng được mô tả; document = nodes/edges trong một Zustand store, sanitize trước khi persist.
- D. Parser: không xác định (không thấy module). Có Mermaid-gate tests (`test:mermaid`, `:layout`, `:gold`) — golden tests tương tự approach của kymo.
- E. Layout: ELK.js chạy trong Web Worker; "anchored layout" (pin node bằng `P`, auto-layout sắp phần còn lại).
- F. Output: PNG, SVG, PDF, Mermaid, PlantUML, Figma-editable SVG, JSON; WebM/MP4 qua WebCodecs H.264 + muxer trong browser (fallback MediaRecorder). Animation = node-by-node walkthrough, không phải SVG-native.
- G. Extensibility: plugin diagram-type registry.
- H. DX: browser editor, live code panel; CLI/LSP không xác định.

**§3** — Insufficient evidence (<3 component có pipeline xác nhận).

**§4 Verdict** — Đáng tham khảo: (1) *anchored layout* = pin node rồi auto-layout phần còn lại, khớp ý tưởng parent/child anchoring trong `alignment.py`; (2) export video qua WebCodecs thay vì GIF cho kymo animated SVG. Red flag: không IR/parser rõ ràng, DSL tách rời state canvas. Open question: parser nằm đâu? Verdict: **glance only**.
