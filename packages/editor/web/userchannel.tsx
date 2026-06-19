import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useWorkspace } from "./workspace";
import { USER_WS } from "./const";
import { LOCAL } from "./localdb";
import { requestOpen, requestClose } from "./tabs";
import { pingMcp, registerPinSender, setPinned, registerCtxSender, sessionIdValue, sessionCtx, pushStatus, registerPromptSender, runNewProjectSim, simulateValue } from "./mcpstatus";

// Connects every signed-in tab to the user's control channel (one DO per email)
// so the MCP `ui_open_diagram` / `ui_open_project` tools can steer THIS tab. Carries no
// document — only control messages:
//   • `{type:"open", id}`         → switch which diagram the tab shows (a route change)
//   • `{type:"open-project", id}` → switch the active project the explorer is scoped to
//   • `{type:"close", id}`        → close a diagram tab (MCP ui_close_file)
// Renders nothing. Like useRoom, a dropped socket is not auto-reconnected (parity
// with the live gap R10) — a reload re-establishes it.
export function UserChannel() {
  const { signedIn } = useAuth();
  const navigate = useNavigate();
  const navRef = useRef(navigate); navRef.current = navigate;
  const { setCurrentProject, refresh } = useWorkspace();
  const setProjectRef = useRef(setCurrentProject); setProjectRef.current = setCurrentProject;
  const refreshRef = useRef(refresh); refreshRef.current = refresh;

  useEffect(() => {
    if (!signedIn) return;
    if (LOCAL) return; // no control channel locally (MCP live-switch is a server feature)
    let ws: WebSocket;
    // The session cookie (Domain=kymo.studio) rides the WS handshake — no token in the URL.
    try { ws = new WebSocket(USER_WS); }
    catch { return; }
    // Report focus so the server routes MCP control messages (open / open-project /
    // close) to the window the user is actually using, not every open editor window.
    const reportFocus = () => { try { if (ws.readyState === 1 && document.visibilityState === "visible") ws.send(JSON.stringify({ type: "focus" })); } catch {} };
    // Announce this window's session id + current project/diagram so MCP can list it.
    ws.addEventListener("open", () => { try { ws.send(JSON.stringify({ type: "hello", session: sessionIdValue(), ...sessionCtx() })); } catch {} reportFocus(); });
    window.addEventListener("focus", reportFocus);
    document.addEventListener("visibilitychange", reportFocus);
    // Let the ✨ button pin/unpin THIS window as the AI target over this socket.
    registerPinSender((on) => { try { if (ws.readyState === 1) ws.send(JSON.stringify({ type: on ? "pin" : "unpin" })); } catch {} });
    // Push project/diagram changes so ui_list_sessions stays current.
    registerCtxSender((c) => { try { if (ws.readyState === 1) ws.send(JSON.stringify({ type: "ctx", session: sessionIdValue(), ...c })); } catch {} });
    // Send prompts the user types in the panel → agent's wait_for_user_message.
    registerPromptSender((text) => { try { if (ws.readyState === 1) { ws.send(JSON.stringify({ type: "prompt", text, simulate: simulateValue() })); return true; } } catch {} return false; });
    ws.addEventListener("message", (e) => {
      let data: any; try { data = JSON.parse(e.data); } catch { return; }
      if (data && data.type === "ai-target") { setPinned(!!data.pinned); return; } // server: am I the target?
      if (data) pingMcp(); // every control message here is MCP-driven → AI is active
      if (data && data.type === "status") { pushStatus(data); return; } // ui_status → live feed in panel
      // open a diagram as a tab in the live editor; if no editor is mounted
      // (e.g. on /projects), fall back to a ?d= deep-link that the editor adopts.
      if (data && data.type === "open" && data.id) { if (!requestOpen(String(data.id))) navRef.current("/?d=" + encodeURIComponent(String(data.id))); }
      else if (data && data.type === "open-project" && data.id) {
        const pid = String(data.id);
        // Refetch the project list FIRST so a brand-new project is present — otherwise
        // the workspace auto-pin effect bounces an unknown id back to project[0] (and
        // the switcher wouldn't show it without a reload). Then switch + navigate.
        Promise.resolve(refreshRef.current?.()).then(() => { setProjectRef.current(pid); navRef.current("/?p=" + encodeURIComponent(pid)); });
      }
      else if (data && data.type === "close" && data.id) { requestClose(String(data.id)); }
      else if (data && data.type === "ui-new-project" && data.name) { runNewProjectSim(String(data.name)); } // simulate the real New-project UI flow
    });
    ws.addEventListener("error", () => { try { ws.close(); } catch {} });
    return () => {
      window.removeEventListener("focus", reportFocus);
      document.removeEventListener("visibilitychange", reportFocus);
      registerPinSender(null);
      registerCtxSender(null);
      registerPromptSender(null);
      try { ws.close(); } catch {}
    };
  }, [signedIn]);

  return null;
}
