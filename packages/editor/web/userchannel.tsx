import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "./auth";
import { useWorkspace } from "./workspace";
import { USER_WS } from "./const";
import { LOCAL } from "./localdb";
import { requestOpen, requestClose } from "./tabs";
import { pingMcp, registerPinSender, setPinned, registerCtxSender, sessionIdValue, sessionCtx, pushStatus, registerPromptSender, runNewProjectSim, runDeleteProjectSim, simulateValue, pingListening, setConnections } from "./mcpstatus";

// Connects every signed-in tab to the user's control channel (one DO per email)
// so the MCP `ui_open_diagram` / `ui_open_project` tools can steer THIS tab. Carries no
// document — only control messages:
//   • `{type:"open", id}`         → switch which diagram the tab shows (a route change)
//   • `{type:"open-project", id}` → switch the active project the explorer is scoped to
//   • `{type:"close", id}`        → close a diagram tab (MCP ui_close_file)
// Renders nothing. A dropped socket (worker redeploy, network blip) is AUTO-RECONNECTED
// with backoff so the panel/feed/registry recover without a reload; reconnects pause
// while the tab is hidden and resume on focus.
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
    let ws: WebSocket | null = null;
    let stopped = false;
    let retry = 0;
    let timer: number | undefined;

    const send = (obj: unknown) => { try { if (ws && ws.readyState === 1) { ws.send(JSON.stringify(obj)); return true; } } catch {} return false; };
    // Report focus so the server routes MCP control messages to the window in use.
    const reportFocus = () => { if (document.visibilityState === "visible") send({ type: "focus" }); };

    const scheduleReconnect = () => {
      if (stopped || timer !== undefined) return;
      if (document.visibilityState === "hidden") return; // resume on visibility instead of hammering
      const delay = Math.min(10000, 1000 * 2 ** retry); // 1s,2s,4s,8s,10s…
      retry++;
      timer = window.setTimeout(() => { timer = undefined; connect(); }, delay);
    };

    const connect = () => {
      if (stopped) return;
      // The session cookie (Domain=kymo.studio) rides the WS handshake — no token in the URL.
      try { ws = new WebSocket(USER_WS); } catch { scheduleReconnect(); return; }
      // Announce this window's session id + current project/diagram so MCP can list it.
      ws.addEventListener("open", () => { retry = 0; send({ type: "hello", session: sessionIdValue(), ...sessionCtx() }); reportFocus(); });
      ws.addEventListener("message", (e) => {
        let data: any; try { data = JSON.parse(e.data); } catch { return; }
        if (data && data.type === "ai-target") { setPinned(!!data.pinned); return; } // server: am I the target?
        if (data && data.type === "mcp-connections") { setConnections(data); return; } // live registry push (connect/disconnect) — not "AI active"
        if (data) pingMcp(); // every control message here is MCP-driven → AI is active
        if (data && data.type === "status") { pushStatus(data); return; } // ui_status → live feed in panel
        if (data && data.type === "listening") { pingListening(); return; } // a process is waiting → enable the chat composer
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
        else if (data && data.type === "ui-delete-project" && data.id) { runDeleteProjectSim(String(data.id)); } // simulate the real Delete-project UI flow
        else if (data && data.type === "projects-changed") { Promise.resolve(refreshRef.current?.()); } // server-side rename/delete → refetch list (switcher + modal)
      });
      ws.addEventListener("close", () => { if (!stopped) scheduleReconnect(); });
      ws.addEventListener("error", () => { try { ws?.close(); } catch {} }); // → close → reconnect
    };

    // Coming back to a hidden/woken tab: report focus + reconnect promptly if the socket died.
    const onVisible = () => { reportFocus(); if (document.visibilityState === "visible" && (!ws || ws.readyState >= 2)) { retry = 0; scheduleReconnect(); } };

    // Senders read the CURRENT socket via `send` (survives reconnects).
    registerPinSender((on) => { send({ type: on ? "pin" : "unpin" }); });
    registerCtxSender((c) => { send({ type: "ctx", session: sessionIdValue(), ...c }); });
    registerPromptSender((text) => send({ type: "prompt", text, simulate: simulateValue() }));
    window.addEventListener("focus", reportFocus);
    document.addEventListener("visibilitychange", onVisible);
    connect();

    return () => {
      stopped = true;
      if (timer !== undefined) clearTimeout(timer);
      window.removeEventListener("focus", reportFocus);
      document.removeEventListener("visibilitychange", onVisible);
      registerPinSender(null);
      registerCtxSender(null);
      registerPromptSender(null);
      try { ws?.close(); } catch {}
    };
  }, [signedIn]);

  return null;
}
