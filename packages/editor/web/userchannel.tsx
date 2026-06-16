import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useWorkspace } from "./workspace";
import { USER_WS } from "./const";
import { LOCAL } from "./localdb";

// Connects every signed-in tab to the user's control channel (one DO per email)
// so the MCP `open_diagram` / `open_project` tools can steer THIS tab. Carries no
// document — only control messages:
//   • `{type:"open", id}`         → switch which diagram the tab shows (a route change)
//   • `{type:"open-project", id}` → switch the active project the explorer is scoped to
// Renders nothing. Like useRoom, a dropped socket is not auto-reconnected (parity
// with the live gap R10) — a reload re-establishes it.
export function UserChannel() {
  const { idToken } = useAuth();
  const navigate = useNavigate();
  const navRef = useRef(navigate); navRef.current = navigate;
  const { setCurrentProject } = useWorkspace();
  const setProjectRef = useRef(setCurrentProject); setProjectRef.current = setCurrentProject;

  useEffect(() => {
    if (!idToken) return;
    if (LOCAL) return; // no control channel locally (MCP live-switch is a server feature)
    let ws: WebSocket;
    try { ws = new WebSocket(USER_WS + "?id_token=" + encodeURIComponent(idToken)); }
    catch { return; }
    ws.addEventListener("message", (e) => {
      let data: any; try { data = JSON.parse(e.data); } catch { return; }
      if (data && data.type === "open" && data.id) navRef.current("/?d=" + encodeURIComponent(String(data.id)));
      else if (data && data.type === "open-project" && data.id) setProjectRef.current(String(data.id));
    });
    ws.addEventListener("error", () => { try { ws.close(); } catch {} });
    return () => { try { ws.close(); } catch {} };
  }, [idToken]);

  return null;
}
