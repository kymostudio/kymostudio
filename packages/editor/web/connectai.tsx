import React, { useEffect, useRef, useState } from "react";
import { Sparkles, Copy, Check, User, Brain, Wrench, CheckCircle2, Eraser, Send, Wand2, Settings } from "lucide-react";
import { MCP_HTTP, MCP_SSE } from "./const";
import { useMcpActive, useAiTarget, requestPin, sessionIdValue, useStatusFeed, clearStatus, sendPrompt, pushStatus, useSimulate, setSimulate, useListening, feedLength, type StatusKind } from "./mcpstatus";

const FEED_ICON: Record<StatusKind, React.ReactNode> = {
  user: <User size={13} strokeWidth={2} />,
  thinking: <Brain size={13} strokeWidth={2} />,
  action: <Wrench size={13} strokeWidth={2} />,
  result: <CheckCircle2 size={13} strokeWidth={2} />,
};

// "Connect AI" right sidebar (VS Code Copilot-style). Three tabs keep the concerns
// separate: Chat (live activity feed + message input), Connection (live status +
// which window the AI drives), Setup (how to wire an MCP client to mcp.kymo.studio).

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
// Claude Code (the CLI) adds a remote MCP server with one command.
const CLAUDE_CODE_CMD = `claude mcp add --transport http kymostudio ${MCP_HTTP}`;

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

type Tab = "chat" | "connection" | "setup";

export function ConnectAI({ onClose }: { onClose: () => void }) {
  const live = useMcpActive();
  const target = useAiTarget();
  const feed = useStatusFeed();
  const simulate = useSimulate();
  const listening = useListening(); // a process is waiting on wait_for_user_message
  const [tab, setTab] = useState<Tab>("chat");
  const feedRef = useRef<HTMLDivElement>(null);
  // Scroll the body (the feed has no frame/own scroll now) to the latest message.
  useEffect(() => { if (tab !== "chat") return; const el = feedRef.current?.parentElement; if (el) el.scrollTop = el.scrollHeight; }, [feed.length, tab]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", k);
    return () => document.removeEventListener("keydown", k);
  }, [onClose]);
  const [showBridge, setShowBridge] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!settingsOpen) return;
    const h = (e: MouseEvent) => { if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) setSettingsOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [settingsOpen]);
  const [ask, setAsk] = useState("");
  // Auto-grow the composer textarea with its content (up to the CSS max-height,
  // after which it scrolls). Runs on every value change incl. send-clear + tab show.
  const askRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const el = askRef.current; if (!el) return; el.style.height = "auto"; el.style.height = el.scrollHeight + "px"; }, [ask, tab]);
  const replyWatch = useRef<number | undefined>(undefined);
  useEffect(() => () => { if (replyWatch.current) clearTimeout(replyWatch.current); }, []);
  const submitAsk = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const t = ask.trim();
    if (!t || !listening) return;
    const ok = sendPrompt(t);
    pushStatus({ kind: "user", text: t });
    setAsk("");
    if (!ok) { pushStatus({ kind: "result", text: "⚠ Not delivered (offline) — reload & retry." }); return; }
    // No-response watchdog: if nothing comes back in ~20s, the message likely wasn't
    // picked up (the listener stopped). Warn so the user isn't left guessing.
    const snap = feedLength();
    if (replyWatch.current) clearTimeout(replyWatch.current);
    replyWatch.current = window.setTimeout(() => {
      if (feedLength() <= snap) pushStatus({ kind: "result", text: "⚠ No response yet — your message may not have been picked up. Make sure a client is connected and listening (see Setup)." });
    }, 20000);
  };

  const TabBtn = ({ id, label, dot }: { id: Tab; label: string; dot?: boolean }) => (
    <button className={"aiside-tab" + (tab === id ? " active" : "")} role="tab" aria-selected={tab === id} onClick={() => setTab(id)}>
      {label}{dot && <span className="aiside-tab-dot" />}
    </button>
  );

  return (
    <aside className="aiside" aria-label="Connect AI">
      <div className="aiside-head">
        <h2><Sparkles size={17} strokeWidth={2} className="cn-title-ic" /> Connect AI</h2>
        <div className="aiside-head-actions">
          {tab === "chat" && feed.length > 0 && (
            <button className="cn-clear" onClick={clearStatus} aria-label="Clear chat" title="Clear chat"><Eraser size={15} strokeWidth={2} /></button>
          )}
          <div className="aiside-gear-wrap" ref={settingsRef}>
            <button className={"aiside-gear" + (simulate ? " on" : "")} onClick={() => setSettingsOpen((o) => !o)}
              aria-label="Settings" aria-haspopup="menu" aria-expanded={settingsOpen} title={simulate ? "Settings — Simulate UI is on" : "Settings"}>
              <Settings size={16} strokeWidth={2} />
              {simulate && <span className="aiside-gear-badge" aria-hidden="true" />}
            </button>
            {settingsOpen && (
              <div className="aiside-settings" role="menu">
                <button className={"cn-ask-tool" + (simulate ? " on" : "")} onClick={() => setSimulate(!simulate)}
                  role="switch" aria-checked={simulate}
                  title="When on, the AI creates/deletes projects by animating the real UI (no reload) — i.e. it passes simulate:true.">
                  <Wand2 size={13} strokeWidth={2} />
                  Simulate UI
                  <span className="cn-ask-switch" aria-hidden="true" />
                </button>
              </div>
            )}
          </div>
          <button className="aiside-close" onClick={onClose} aria-label="Close panel" title="Close">✕</button>
        </div>
      </div>

      <div className="aiside-tabs" role="tablist">
        <TabBtn id="chat" label="Chat" dot={live} />
        <TabBtn id="connection" label="Connection" dot={target} />
        <TabBtn id="setup" label="Setup" />
      </div>

      <div className="aiside-body">
        {tab === "chat" && (
          feed.length > 0 ? (
            <div className="cn-feed" ref={feedRef}>
              {feed.map((it) => (
                <div key={it.id} className={"cn-msg cn-msg-" + it.kind}>
                  <span className="cn-msg-ic">{FEED_ICON[it.kind]}</span>
                  <span className="cn-msg-text">{it.text}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="cn-empty">
              <p className="cn-empty-lead">Drive kymo by chat — its requests, reasoning &amp; actions show up here.</p>
              <ol className="cn-empty-steps">
                <li>Connect an AI client in <button type="button" className="cn-empty-link" onClick={() => setTab("setup")}>Setup</button> — Claude Code, Cursor, or ChatGPT.</li>
                <li>Ask it to <b>listen for your messages</b> (it calls <code>wait_for_user_message</code>).</li>
                <li>Type below — your message reaches the agent and it edits this diagram live.</li>
              </ol>
              <p className="cn-empty-note">No client connected? You can still drive kymo by chatting <i>inside</i> Claude / Cursor directly.</p>
            </div>
          )
        )}

        {tab === "connection" && (
          <>
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
          </>
        )}

        {tab === "setup" && (
          <>
            <p className="aiside-sub">Drive kymo from Claude, Cursor, or any MCP client — create &amp; edit diagrams by chatting; the changes appear <b>live in this editor</b>.</p>
            <label className="cn-urllabel">MCP server URL</label>
            <div className="cn-url">
              <code>{MCP_HTTP}</code>
              <CopyBtn text={MCP_HTTP} label="Copy server URL" />
            </div>
            <p className="cn-hint">When your client asks, <b>sign in with Google</b> — that links it to this account, so the agent edits your diagrams (and only yours).</p>

            <label className="cn-urllabel">Claude Code (CLI)</label>
            <div className="cn-url">
              <code>{CLAUDE_CODE_CMD}</code>
              <CopyBtn text={CLAUDE_CODE_CMD} label="Copy command" />
            </div>
            <p className="cn-hint">Run it in your terminal, then type <code>/mcp</code> inside Claude Code → pick <b>kymostudio</b> → <b>Authenticate</b> → sign in with Google.</p>

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
          </>
        )}
      </div>

      {tab === "chat" && (
        <div className="cn-ask-foot">
          <form className={"cn-composer" + (listening ? "" : " disabled")} onSubmit={submitAsk}>
            <textarea ref={askRef} className="cn-composer-input" value={ask} onChange={(e) => setAsk(e.target.value)} rows={1}
              disabled={!listening}
              placeholder={listening ? "Describe what you want to create..." : "Waiting for a listener… connect a client and ask it to listen (see Setup)"}
              aria-label="Message the AI"
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); submitAsk(e); } }} />
            <div className="cn-composer-bar">
              <button className="cn-composer-send" type="submit" disabled={!ask.trim() || !listening}
                title={listening ? "Send" : "No listener — connect a client and ask it to listen"}>
                <Send size={14} strokeWidth={2.2} /> Send
              </button>
            </div>
          </form>
        </div>
      )}
    </aside>
  );
}
