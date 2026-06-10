export const GOOGLE_CLIENT_ID = "745071116390-6idggmrtohc6heg6gvuubaamkt8dr68u.apps.googleusercontent.com";
export const MCP_WS = "wss://mcp.kymo.studio/ws";
export const DIAGRAMS_API = "https://mcp.kymo.studio/api/diagrams";
export const SAMPLE = `flowchart TD {
  A[Nhận đơn hàng] --> B{Còn hàng?}
  B -->|Có| C[Thanh toán]
  B -->|Không| D[Thông báo khách]
  C --> E[Đóng gói]
  E --> F((Giao hàng))
  D --> G[Hủy đơn]
}`;
