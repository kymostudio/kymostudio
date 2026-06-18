import React, { useEffect, useState } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { MCP_HTTP, MCP_SSE } from "./const";
import { useMcpActive, useAiTarget, requestPin, sessionIdValue } from "./mcpstatus";

// "Connect AI": kymo already runs a remote MCP server (mcp.kymo.studio) — this
// panel just tells the user how to wire it into their AI client, shows whether an
// AI is connected, and lets them pin WHICH window the AI acts in. It docks on the
// right like VS Code's Copilot sidebar (toggled by the ✨ activity-bar button).

const CONFIG_JSON = `{
  "mcpServers": {
    "kymostudio": { "url": "${MCP_HTTP}" }
  }
}`;
// Older / stdio-only clients bridge a remote URL through mcp-remote.
const CONFIG_BRIDGE = `{
  "mcpServers": {
    "kymostudio": {
      "command": "npx",
      "args": ["mcp-remote", "${MCP_HTTP}"]
    }
  }
}`;

function CopyBtn({ text, label }: { text: string; label?: string }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try { await navigator.clipboard.writeText(text); } catch { window.prompt("Copy:", text); return; }
    setDone(true); setTimeout(() => setDone(false), 1500);
  };
  return (
    <button className="cn-copy" onClick={copy} aria-label={label || "Copy"}>
      {done ? <Check size={14} strokeWidth={2.4} /> : <Copy size={14} strokeWidth={2} />}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

const CLIENTS: { name: string; steps: React.ReactNode; url?: string }[] = [
  {
    name: "Claude (web & desktop)",
    steps: <>Settings → <b>Connectors</b> → <b>Add custom connector</b> → paste the URL → <b>Connect</b> → sign in with Google.</>,
  },
  {
    name: "Cursor",
    url: MCP_SSE,
    steps: <>Settings → <b>MCP</b> → <b>Add new server</b> → paste the URL (Cursor uses the <b>SSE</b> endpoint) → authorize.</>,
  },
  {
    name: "ChatGPT",
    steps: <>Settings → <b>Connectors</b> → <b>Add</b> → paste the URL → authorize.</>,
  },
];

export function ConnectAI({ onClose }: { onClose: () => void }) {
  const live = useMcpActive();
  const target = useAiTarget();
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  const [showBridge, setShowBridge] = useState(false);
  return (
    <aside className="aiside" aria-label="Connect AI">
      <div className="aiside-head">
        <h2><Sparkles size={17} strokeWidth={2} className="cn-title-ic" /> Connect AI</h2>
        <button className="aiside-close" onClick={onClose} aria-label="Close panel" title="Close">✕</button>
      </div>
      <div className="aiside-body">
        <p className="aiside-sub">Drive kymo from Claude, Cursor, or any MCP client — create &amp; edit diagrams by chatting; the changes appear <b>live in this editor</b>.</p>

        <div className={"cn-status" + (live ? " live" : "")}>
          <span className="cn-status-dot" />
          {live ? "Connected — an AI client is driving this editor right now." : "Waiting for an AI client to connect…"}
        </div>

        <button className={"cn-target" + (target ? " on" : "")} onClick={() => requestPin(!target)} aria-pressed={target}>
          <Sparkles size={15} strokeWidth={2} />
          <span className="cn-target-txt">{target ? "AI is controlling THIS window" : "Make AI control this window"}</span>
          <span className="cn-target-state">{target ? "On" : "Off"}</span>
        </button>
        <p className="cn-target-hint">With the editor open in several windows, AI commands act only on the chosen window. None chosen → the window you used most recently. From an AI client: <code>ui_list_sessions</code> then <code>ui_switch_session</code>.</p>
        <p className="cn-session">This window · session <code>{sessionIdValue()}</code></p>

        <label className="cn-urllabel">MCP server URL</label>
        <div className="cn-url">
          <code>{MCP_HTTP}</code>
          <CopyBtn text={MCP_HTTP} label="Copy server URL" />
        </div>
        <p className="cn-hint">When your client asks, <b>sign in with Google</b> — that links it to this account, so the agent edits your diagrams (and only yours).</p>

        <div className="cn-clients">
          {CLIENTS.map((c) => (
            <div className="cn-client" key={c.name}>
              <div className="cn-client-head">
                <span className="cn-client-name">{c.name}</span>
                {c.url && <CopyBtn text={c.url} label={`Copy ${c.name} URL`} />}
              </div>
              <p className="cn-client-steps">{c.steps}</p>
            </div>
          ))}
        </div>

        <div className="cn-config">
          <div className="cn-config-head">
            <span>Or drop this into a config file <span className="cn-dim">(<code>claude_desktop_config.json</code>, <code>mcp.json</code>)</span></span>
            <CopyBtn text={showBridge ? CONFIG_BRIDGE : CONFIG_JSON} label="Copy config" />
          </div>
          <pre className="cn-pre"><code>{showBridge ? CONFIG_BRIDGE : CONFIG_JSON}</code></pre>
          <button className="cn-toggle" onClick={() => setShowBridge((b) => !b)}>
            {showBridge ? "← Remote URL works in most clients" : "Older client? Use the npx mcp-remote bridge →"}
          </button>
        </div>

        <p className="cn-try">Then try: <i>“Create a sequence diagram for checkout”</i> · <i>“Rename this to Payments”</i> · <i>“List my diagrams”</i> — and watch them show up here.</p>
      </div>
    </aside>
  );
}
