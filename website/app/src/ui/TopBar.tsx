/**
 * ui/TopBar.tsx — canvas-studio P2 (FR-CS-02).
 *
 * The editor top bar that replaces the old <header>. Trimmed to what a
 * client-only playground actually needs: brand, an editable title (local),
 * the Code/Preview panel toggle, undo/redo wired to the engine history, a
 * theme toggle, and Export/Share (the existing handlers). Breadcrumb, star,
 * Comments/Versions tabs, and presence avatars were dropped — they imply a
 * backend (boards, comments, multiuser) that is out of scope. Presentational;
 * classes are token-driven (index.html), so it themes via [data-theme].
 */
import type { Theme } from "../kymo";
import { Undo, Redo, Sun, Moon, Download, Share, Code, Play } from "./icons";

export interface TopBarProps {
  title: string;
  onTitleChange: (t: string) => void;
  theme: Theme;
  onToggleTheme: () => void;
  showCode: boolean;
  onToggleCode: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onExport: () => void;
  onShare: () => void;
}

export function TopBar({
  title,
  onTitleChange,
  theme,
  onToggleTheme,
  showCode,
  onToggleCode,
  onUndo,
  onRedo,
  onExport,
  onShare,
}: TopBarProps) {
  return (
    <header className="k-topbar">
      <span className="k-logo">
        <span className="dot" /> kymo <small>playground</small>
      </span>

      <div className="sep" />

      <div className="title">
        <input
          className="title-input"
          value={title}
          onChange={(e) => onTitleChange(e.target.value)}
          spellCheck={false}
          aria-label="Diagram title"
        />
      </div>

      <div className="center-tabs">
        <button className={showCode ? "active" : ""} onClick={onToggleCode} title="Toggle code panel (⌘/)">
          <Code size={12} /> Code
        </button>
        <button className="active" title="Canvas preview">
          <Play size={12} /> Preview
        </button>
      </div>

      <button className="k-btn k-btn--ghost k-btn--icon k-btn--sm" onClick={onUndo} title="Undo (⌘Z)">
        <Undo size={14} />
      </button>
      <button className="k-btn k-btn--ghost k-btn--icon k-btn--sm" onClick={onRedo} title="Redo (⇧⌘Z)">
        <Redo size={14} />
      </button>

      <div className="sep" />

      <button
        className="k-btn k-btn--ghost k-btn--icon k-btn--sm"
        onClick={onToggleTheme}
        title={theme === "dark" ? "Switch to light" : "Switch to dark"}
      >
        {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
      </button>

      <div className="sep" />

      <button className="k-btn k-btn--outline k-btn--sm" onClick={onExport} title="Download the rendered SVG">
        <Download size={12} /> Export
      </button>
      <button className="k-btn k-btn--primary k-btn--sm" onClick={onShare} title="Copy a shareable link">
        <Share size={12} /> Share
      </button>
    </header>
  );
}
