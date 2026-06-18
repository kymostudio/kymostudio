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
