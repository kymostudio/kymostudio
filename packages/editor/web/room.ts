import { useCallback, useEffect, useMemo, useRef } from "react";
import { MCP_WS } from "./const";
import { LOCAL, localGetDoc, localSetSource, localSetTitle } from "./localdb";
import { pingMcp } from "./mcpstatus";

type Handlers = {
  onDoc?: (source: string, title: string | undefined, fromSelf: boolean, kind?: string, simulate?: boolean) => void;
  onMeta?: (title: string) => void;
  onLive?: (live: boolean) => void;
};

export function useRoom(roomId: string | null, signedIn: boolean, handlers: Handlers) {
  const wsRef = useRef<WebSocket | null>(null);
  const myId = useMemo(() => Math.random().toString(36).slice(2), []);
  const hRef = useRef(handlers); hRef.current = handlers;

  useEffect(() => {
    if (!roomId || !signedIn) return;
    // Local dev: no WebSocket server — the document lives in localStorage. Report
    // "live", then deliver the stored doc (empty for a just-created room, which
    // makes the editor persist the in-buffer source on the next tick, like prod).
    if (LOCAL) {
      hRef.current.onLive?.(true);
      const doc = localGetDoc(roomId);
      const t = setTimeout(() => hRef.current.onDoc?.(doc?.source ?? "", doc?.title, false, doc?.kind), 0);
      return () => clearTimeout(t);
    }
    let ws: WebSocket;
    // The session cookie (Domain=kymo.studio) rides the WS handshake — no token in the URL.
    try { ws = new WebSocket(MCP_WS + "?d=" + encodeURIComponent(roomId)); }
    catch { return; }
    wsRef.current = ws;
    ws.addEventListener("open", () => hRef.current.onLive?.(true));
    ws.addEventListener("close", () => hRef.current.onLive?.(false));
    ws.addEventListener("error", () => { try { ws.close(); } catch {} });
    ws.addEventListener("message", (e) => {
      let data: any; try { data = JSON.parse(e.data); } catch { return; }
      if (!data) return;
      if (data.origin === "mcp") pingMcp(); // edit_diagram pushed this → AI is active
      if (data.type === "meta") { hRef.current.onMeta?.(data.title); return; }
      if (data.type !== "doc") return;
      hRef.current.onDoc?.(String(data.source ?? ""), data.title, data.origin === myId, data.kind, !!data.simulate);
    });
    return () => { try { ws.close(); } catch {} wsRef.current = null; };
  }, [roomId, signedIn, myId]);

  const sendSource = useCallback((source: string, kind?: string) => {
    if (LOCAL) { if (roomId) localSetSource(roomId, source, kind); return; }
    const ws = wsRef.current; if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: "set", source, kind, origin: myId }));
  }, [myId, roomId]);
  const sendRename = useCallback((title: string) => {
    if (LOCAL) { if (roomId) localSetTitle(roomId, title); return; }
    const ws = wsRef.current; if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: "rename", title, origin: myId }));
  }, [myId, roomId]);
  return { sendSource, sendRename };
}
