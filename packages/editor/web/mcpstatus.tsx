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
