/**
 * ui/TopBar.tsx — canvas-studio P2 (FR-CS-02) + P7 (FR-CS-07, CR-STUDIO-001).
 *
 * The editor top bar that replaces the old <header>. P7 made it the single
 * owner of the chrome controls: the sample/starter picker and a 3-mode
 * canvas-background control (light / dark / transparent) moved here from the
 * retired floating toolbar, and the old standalone theme toggle is *subsumed*
 * by that control (light/dark re-theme chrome+canvas via the single `theme`
 * var; transparent flips only the canvas bg). Export has one entry point, and
 * the Code/Preview tabs reflect true panel state (Preview active ⇔ code pane
 * hidden). Presentational; classes are token-driven (index.html) → themes via
 * [data-theme].
 */
import { Undo, Redo, Sun, Moon, Checker, Download, Share, Code, Play, ChevronDown } from "./icons";

type Bg = "light" | "dark" | "transparent";

export interface TopBarProps {
  title: string;
  onTitleChange: (t: string) => void;
  /** P7 (FR-CS-07): sample picker + 3-mode background, relocated here. */
  samples: Record<string, { label: string }>;
  sampleKey: string;
  onSampleChange: (key: string) => void;
  selectBg: (mode: Bg) => void;
  bgActive: (mode: Bg) => boolean;
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
  samples,
  sampleKey,
  onSampleChange,
  selectBg,
  bgActive,
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

      {/* P7: starter/sample picker — single owner, moved from the floating bar. */}
      <span className="k-sample">
        <select
          data-testid="topbar-sample"
          title="Load a starter diagram"
          value={sampleKey}
          onChange={(e) => onSampleChange(e.target.value)}
          aria-label="Starter diagram"
        >
          {Object.entries(samples).map(([key, s]) => (
            <option key={key} value={key}>
              {s.label}
            </option>
          ))}
        </select>
        <ChevronDown size={14} />
      </span>

      <div className="center-tabs">
        <button
          data-testid="tab-code"
          className={showCode ? "active" : ""}
          onClick={onToggleCode}
          title="Toggle code panel (⌘/)"
        >
          <Code size={12} /> Code
        </button>
        <button
          data-testid="tab-preview"
          className={!showCode ? "active" : ""}
          onClick={() => {
            if (showCode) onToggleCode();
          }}
          title="Canvas preview"
        >
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

      {/* P7 (FR-CS-07): the single appearance control — subsumes the standalone
          theme toggle and the floating bar's light/dark/transparent triplet. */}
      <div className="k-seg" role="group" aria-label="Canvas background">
        <button
          data-testid="topbar-bg-light"
          className={bgActive("light") ? "active" : ""}
          onClick={() => selectBg("light")}
          title="Light canvas"
          aria-label="Light canvas"
        >
          <Sun size={14} />
        </button>
        <button
          data-testid="topbar-bg-dark"
          className={bgActive("dark") ? "active" : ""}
          onClick={() => selectBg("dark")}
          title="Dark canvas"
          aria-label="Dark canvas"
        >
          <Moon size={14} />
        </button>
        <button
          data-testid="topbar-bg-transparent"
          className={bgActive("transparent") ? "active" : ""}
          onClick={() => selectBg("transparent")}
          title="Transparent (no background)"
          aria-label="Transparent canvas"
        >
          <Checker size={14} />
        </button>
      </div>

      <div className="sep" />

      <button
        data-testid="export"
        className="k-btn k-btn--outline k-btn--sm"
        onClick={onExport}
        title="Download the rendered SVG"
      >
        <Download size={12} /> Export
      </button>
      <button className="k-btn k-btn--primary k-btn--sm" onClick={onShare} title="Copy a shareable link">
        <Share size={12} /> Share
      </button>
    </header>
  );
}
