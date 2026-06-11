import { useCallback, useEffect, useMemo, useRef } from "react";
import { MCP_WS } from "./const";

type Handlers = {
  onDoc?: (source: string, title: string | undefined, fromSelf: boolean, kind?: string) => void;
  onMeta?: (title: string) => void;
  onLive?: (live: boolean) => void;
};

export function useRoom(roomId: string | null, idToken: string | null, handlers: Handlers) {
  const wsRef = useRef<WebSocket | null>(null);
  const myId = useMemo(() => Math.random().toString(36).slice(2), []);
  const hRef = useRef(handlers); hRef.current = handlers;

  useEffect(() => {
    if (!roomId || !idToken) return;
    let ws: WebSocket;
    try { ws = new WebSocket(MCP_WS + "?id_token=" + encodeURIComponent(idToken) + "&d=" + encodeURIComponent(roomId)); }
    catch { return; }
    wsRef.current = ws;
    ws.addEventListener("open", () => hRef.current.onLive?.(true));
    ws.addEventListener("close", () => hRef.current.onLive?.(false));
    ws.addEventListener("error", () => { try { ws.close(); } catch {} });
    ws.addEventListener("message", (e) => {
      let data: any; try { data = JSON.parse(e.data); } catch { return; }
      if (!data) return;
      if (data.type === "meta") { hRef.current.onMeta?.(data.title); return; }
      if (data.type !== "doc") return;
      hRef.current.onDoc?.(String(data.source ?? ""), data.title, data.origin === myId, data.kind);
    });
    return () => { try { ws.close(); } catch {} wsRef.current = null; };
  }, [roomId, idToken, myId]);

  const sendSource = useCallback((source: string, kind?: string) => {
    const ws = wsRef.current; if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: "set", source, kind, origin: myId }));
  }, [myId]);
  const sendRename = useCallback((title: string) => {
    const ws = wsRef.current; if (ws && ws.readyState === 1) ws.send(JSON.stringify({ type: "rename", title, origin: myId }));
  }, [myId]);
  return { sendSource, sendRename };
}
