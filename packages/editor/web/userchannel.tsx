import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { USER_WS } from "./const";

// Connects every signed-in tab to the user's control channel (one DO per email)
// so the MCP `open_diagram` tool can switch which diagram THIS tab is showing.
// Carries no document — only `{type:"open", id}` control messages, which we turn
// into a client-side route change (same nav the Explorer uses). Renders nothing.
// Like useRoom, a dropped socket is not auto-reconnected (parity with the live
// gap R10) — a reload re-establishes it.
export function UserChannel() {
  const { idToken } = useAuth();
  const navigate = useNavigate();
  const navRef = useRef(navigate); navRef.current = navigate;

  useEffect(() => {
    if (!idToken) return;
    let ws: WebSocket;
    try { ws = new WebSocket(USER_WS + "?id_token=" + encodeURIComponent(idToken)); }
    catch { return; }
    ws.addEventListener("message", (e) => {
      let data: any; try { data = JSON.parse(e.data); } catch { return; }
      if (data && data.type === "open" && data.id) navRef.current("/?d=" + encodeURIComponent(String(data.id)));
    });
    ws.addEventListener("error", () => { try { ws.close(); } catch {} });
    return () => { try { ws.close(); } catch {} };
  }, [idToken]);

  return null;
}
