import { useEffect, useReducer } from "react";

// Lightweight "is an AI (MCP client) driving this editor?" signal. The editor can
// only observe MCP indirectly — through the events MCP causes: control messages on
// the UserChannel (ui_open_diagram / ui_open_project / ui_close_file) and doc
// pushes from `edit_diagram` (origin "mcp" on the EditorRoom socket). Each of those
// calls `pingMcp()`; the UI shows "active" for a window after the last ping, then
// fades. Not a true presence flag (stateless HTTP MCP has no persistent session),
// so we surface recent ACTIVITY, which is what the user actually cares about.

const WINDOW_MS = 120_000; // consider the AI "active" for 2 min after the last event
let lastActive = 0;
const subs = new Set<() => void>();

export function pingMcp() {
  lastActive = Date.now();
  subs.forEach((f) => f());
}

export function mcpActive(): boolean {
  return lastActive > 0 && Date.now() - lastActive < WINDOW_MS;
}

// Re-renders on each ping and on a slow interval so the badge fades out on its own.
export function useMcpActive(): boolean {
  const [, bump] = useReducer((c: number) => c + 1, 0);
  useEffect(() => {
    subs.add(bump);
    const iv = setInterval(bump, 10_000);
    return () => { subs.delete(bump); clearInterval(iv); };
  }, []);
  return mcpActive();
}

// ---- AI-target pin: which open editor WINDOW receives MCP control messages
// (ui_open_diagram / ui_open_project / ui_close_file). The user clicks the ✨
// activity-bar button to pin THIS window; the server (UserChannel DO) enforces a
// single target and echoes `{type:"ai-target", pinned}` back, which sets `pinned`
// here. Before any pin the server falls back to the most-recently-focused window. ----

let pinned = false;
let pinSender: ((on: boolean) => void) | null = null;
const pinSubs = new Set<() => void>();
const notifyPin = () => pinSubs.forEach((f) => f());

// userchannel.tsx registers the WS sender (and clears it on unmount).
export function registerPinSender(fn: ((on: boolean) => void) | null) { pinSender = fn; }

// Server told us whether this window is the pinned target — reconcile local state.
export function setPinned(on: boolean) { if (pinned !== on) { pinned = on; notifyPin(); } }

// ✨ button toggles: optimistic local flip + ask the server to (re)assign the target.
export function requestPin(on: boolean) {
  if (pinned !== on) { pinned = on; notifyPin(); }
  pinSender?.(on);
}

export function useAiTarget(): boolean {
  const [, bump] = useReducer((c: number) => c + 1, 0);
  useEffect(() => { pinSubs.add(bump); return () => { pinSubs.delete(bump); }; }, []);
  return pinned;
}

// ---- Session identity: each open editor WINDOW (browser tab) gets a short,
// stable id (kept in sessionStorage so a reload keeps it). The editor reports it
// + its current project/diagram over the UserChannel; the MCP `ui_list_sessions`
// tool enumerates windows and `ui_switch_session` makes one the AI target. ----

let sessionId = "";
export function sessionIdValue(): string {
  if (sessionId) return sessionId;
  try {
    sessionId = sessionStorage.getItem("kymo_session_id") || "";
    if (!sessionId) {
      const raw = (typeof crypto !== "undefined" && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2);
      sessionId = raw.replace(/-/g, "").slice(0, 6);
      sessionStorage.setItem("kymo_session_id", sessionId);
    }
  } catch { sessionId = sessionId || Math.random().toString(36).slice(2, 8); }
  return sessionId;
}

// ---- Live activity feed: lines pushed by the MCP `ui_status` tool (the AI
// narrating its work — user request / thinking / action / result). Rendered as a
// chat-like feed in the Connect AI panel. ----

export type StatusKind = "user" | "thinking" | "action" | "result";
export type StatusItem = { id: number; kind: StatusKind; text: string; ts: number };
let feed: StatusItem[] = [];
let feedSeq = 0;
const feedSubs = new Set<() => void>();

export function pushStatus(it: { kind?: string; text?: string; ts?: number }) {
  const kind: StatusKind = (["user", "thinking", "action", "result"].includes(String(it.kind)) ? it.kind : "thinking") as StatusKind;
  const text = String(it.text ?? "");
  // Drop a consecutive duplicate (e.g. the panel's local echo of a typed prompt +
  // the agent re-narrating the same line via ui_status).
  const last = feed[feed.length - 1];
  if (last && last.kind === kind && last.text === text) return;
  feed = [...feed, { id: ++feedSeq, kind, text, ts: Number(it.ts) || 0 }].slice(-200);
  feedSubs.forEach((f) => f());
}
export function clearStatus() { feed = []; feedSubs.forEach((f) => f()); }
export function feedLength(): number { return feed.length; }

// Send a prompt the user typed in the panel up to the control channel → the agent
// receives it via the MCP `wait_for_user_message` tool (web → session). Returns
// whether it was sent (socket connected).
let promptSender: ((text: string) => boolean) | null = null;
export function registerPromptSender(fn: ((text: string) => boolean) | null) { promptSender = fn; }
export function sendPrompt(text: string): boolean { return promptSender ? promptSender(text) : false; }

// MCP-driven "create project by simulating the real UI" (open switcher → fill name
// input → submit, no reload). addressbar.tsx registers the simulator; userchannel
// calls it when the worker pushes {type:"ui-new-project", name}.
let newProjectSim: ((name: string) => void) | null = null;
export function registerNewProjectSimulator(fn: ((name: string) => void) | null) { newProjectSim = fn; }
export function runNewProjectSim(name: string): boolean { if (newProjectSim) { newProjectSim(name); return true; } return false; }

// Projects management modal: the addressbar ("Manage projects…") and the
// delete-project simulator open it via this opener (registered by ProjectsModal).
let projectsModalOpener: (() => void) | null = null;
export function registerProjectsModalOpener(fn: (() => void) | null) { projectsModalOpener = fn; }
export function openProjectsModal(): boolean { if (projectsModalOpener) { projectsModalOpener(); return true; } return false; }

// Keyboard Shortcuts modal: opened from Settings → Keyboard Shortcuts and the "?" key.
let shortcutsOpener: (() => void) | null = null;
export function registerShortcutsOpener(fn: (() => void) | null) { shortcutsOpener = fn; }
export function openShortcuts(): boolean { if (shortcutsOpener) { shortcutsOpener(); return true; } return false; }

// Connect AI panel toggle (EditorPage registers it) — used by the ⌘/Ctrl+⇧+A shortcut.
let connectToggle: (() => void) | null = null;
export function registerConnectToggle(fn: (() => void) | null) { connectToggle = fn; }
export function toggleConnect(): boolean { if (connectToggle) { connectToggle(); return true; } return false; }

// Primary sidebar (Explorer) toggle (EditorPage registers it) — used by the ⌘/Ctrl+B shortcut.
let sidebarToggle: (() => void) | null = null;
export function registerSidebarToggle(fn: (() => void) | null) { sidebarToggle = fn; }
export function toggleSidebar(): boolean { if (sidebarToggle) { sidebarToggle(); return true; } return false; }

// Source/Preview pane toggles (EditorPage registers) — used by ⌘/Ctrl+⇧+E and ⌘/Ctrl+⇧+P.
let paneToggle: ((k: "source" | "preview") => void) | null = null;
export function registerPaneToggle(fn: ((k: "source" | "preview") => void) | null) { paneToggle = fn; }
export function firePaneToggle(k: "source" | "preview"): boolean { if (paneToggle) { paneToggle(k); return true; } return false; }

// New-diagram launcher (EditorPage registers) — used by the "N" shortcut.
let newDiagram: (() => void) | null = null;
export function registerNewDiagram(fn: (() => void) | null) { newDiagram = fn; }
export function fireNewDiagram(): boolean { if (newDiagram) { newDiagram(); return true; } return false; }

// ---- "A process is listening" signal: the server pushes {type:"listening"} each
// time something long-polls wait_for_user_message (~every 25s). The chat composer
// is disabled until this is fresh, so users can't type into a void. ----
const LISTEN_MS = 35_000; // a poll fires ~every 25s; treat as listening within 35s
let lastListen = 0;
const listenSubs = new Set<() => void>();
export function pingListening() { lastListen = Date.now(); listenSubs.forEach((f) => f()); }
export function useListening(): boolean {
  const [, bump] = useReducer((c: number) => c + 1, 0);
  useEffect(() => { listenSubs.add(bump); const iv = setInterval(bump, 5000); return () => { listenSubs.delete(bump); clearInterval(iv); }; }, []);
  return lastListen > 0 && Date.now() - lastListen < LISTEN_MS;
}

// ---- MCP connection registry (FR-AI-11): the server pushes {type:"mcp-connections"}
// over /userws whenever a client connects/disconnects (and on a freshly-opened tab).
// The Connection tab renders this live — no polling. ----
export type McpConn = { connId: string; client: string; clientVersion: string; protocol: string; serverVersion: string; connectedAt: number; lastSeenAt: number; outdated: boolean; reasons: string[] };
export type ConnData = { connections: McpConn[]; summary: { total: number; connected: number; outdated: number } };
let connData: ConnData | null = null;
const connSubs = new Set<() => void>();
export function setConnections(d: ConnData) { connData = d; connSubs.forEach((f) => f()); }
export function useConnections(): ConnData | null {
  const [, bump] = useReducer((c: number) => c + 1, 0);
  useEffect(() => { connSubs.add(bump); return () => { connSubs.delete(bump); }; }, []);
  return connData;
}

// Find: open the Search panel + focus its box (EditorPage registers) — ⌘/Ctrl+F.
let findOpen: (() => void) | null = null;
export function registerFindOpen(fn: (() => void) | null) { findOpen = fn; }
export function openFind(): boolean { if (findOpen) { findOpen(); return true; } return false; }

// MCP-driven "delete project by simulating the real UI" (open Manage-projects modal →
// filter to the project → click delete → confirm). ProjectsModal registers it;
// userchannel calls it when the worker pushes {type:"ui-delete-project", id}.
let deleteProjectSim: ((id: string) => void) | null = null;
export function registerDeleteProjectSimulator(fn: ((id: string) => void) | null) { deleteProjectSim = fn; }
export function runDeleteProjectSim(id: string): boolean { if (deleteProjectSim) { deleteProjectSim(id); return true; } return false; }

// "Simulate UI" preference (a toggle under the chat input). When on, prompts the user
// sends carry simulate:true → the agent calls MCP new_project with simulate:true so
// the editor animates the real New-project UI. Persisted across reloads.
let simulatePref = (() => { try { return localStorage.getItem("kymo_ai_simulate") === "1"; } catch { return false; } })();
const simSubs = new Set<() => void>();
export function simulateValue(): boolean { return simulatePref; }
export function setSimulate(on: boolean) {
  if (simulatePref === on) return;
  simulatePref = on;
  try { localStorage.setItem("kymo_ai_simulate", on ? "1" : "0"); } catch {}
  simSubs.forEach((f) => f());
}
export function useSimulate(): boolean {
  const [, bump] = useReducer((c: number) => c + 1, 0);
  useEffect(() => { simSubs.add(bump); return () => { simSubs.delete(bump); }; }, []);
  return simulatePref;
}
export function useStatusFeed(): StatusItem[] {
  const [, bump] = useReducer((c: number) => c + 1, 0);
  useEffect(() => { feedSubs.add(bump); return () => { feedSubs.delete(bump); }; }, []);
  return feed;
}

export type SessionCtx = { project?: string; projectName?: string; diagram?: string; title?: string };
let ctx: SessionCtx = {};
let ctxSender: ((c: SessionCtx) => void) | null = null;

// userchannel.tsx registers the WS sender; pushing the current ctx immediately so
// a freshly-connected socket carries project/diagram from the start.
export function registerCtxSender(fn: ((c: SessionCtx) => void) | null) { ctxSender = fn; if (fn) fn(ctx); }
export function sessionCtx(): SessionCtx { return ctx; }
export function setSessionCtx(next: SessionCtx) {
  const merged = { ...ctx, ...next };
  if (JSON.stringify(merged) === JSON.stringify(ctx)) return;
  ctx = merged; ctxSender?.(ctx);
}
