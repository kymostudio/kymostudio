import {
  createContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SETS, editorUrl, type DiagramExample } from "./examples";
import "./quickstart.css";

// Stripe-quickstart-style layout: prose on the left, a sticky pane on the right
// with a collapsible Preview (rendered diagram of the section in view) above the
// matching source. <DqSection> children register scroll anchors via this context.
type DqCtx = {
  register: (id: string, el: HTMLElement) => void;
  unregister: (id: string) => void;
  activeId: string;
  activate: (id: string) => void;
};
export const DqContext = createContext<DqCtx | null>(null);

export function DiagramQuickstart({
  set,
  children,
}: {
  set: keyof typeof SETS;
  children?: ReactNode;
}) {
  const examples = SETS[set];
  const [activeId, setActiveId] = useState(examples[0].id);
  const [previewOpen, setPreviewOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const markers = useRef(new Map<string, HTMLElement>());
  const previewImg = useRef<HTMLImageElement>(null);

  const active: DiagramExample =
    examples.find((e) => e.id === activeId) ?? examples[0];

  const ctx = useMemo<DqCtx>(
    () => ({
      register: (id, el) => markers.current.set(id, el),
      unregister: (id) => markers.current.delete(id),
      activeId,
      activate: (id) => {
        if (examples.some((e) => e.id === id)) setActiveId(id);
      },
    }),
    [activeId, examples],
  );

  // Scroll-spy: active example = the last marker scrolled above 40% of the
  // viewport; before the first marker is reached, the topmost one wins.
  useEffect(() => {
    const onScroll = () => {
      const cut = window.innerHeight * 0.4;
      let best: string | undefined;
      let bestTop = -Infinity;
      let first: string | undefined;
      let firstTop = Infinity;
      for (const [id, el] of markers.current) {
        const top = el.getBoundingClientRect().top;
        if (top <= cut && top > bestTop) {
          bestTop = top;
          best = id;
        }
        if (top < firstTop) {
          firstTop = top;
          first = id;
        }
      }
      const next = best ?? first;
      if (next) setActiveId(next);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const lines = active.code.replace(/\n$/, "").split("\n");
  const hasHl = (active.hl?.length ?? 0) > 0;
  const lineClass = (n: number) =>
    !hasHl
      ? ""
      : active.hl!.some(([a, b]) => n >= a && n <= b)
        ? "hl"
        : "dim";

  // Fill the pane width, but never blow a small diagram up past 2× natural size.
  const applyCap = (img: HTMLImageElement) => {
    if (img.naturalWidth > 0) img.style.maxWidth = `${img.naturalWidth * 2}px`;
  };
  useEffect(() => {
    if (previewImg.current?.complete) applyCap(previewImg.current);
  }, [active.image]);

  const copy = async () => {
    await navigator.clipboard.writeText(active.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1600);
  };
  const openEditor = async () => {
    window.open(await editorUrl(active.code), "_blank", "noopener");
  };

  return (
    <DqContext.Provider value={ctx}>
      <div className="dq">
        <div className="dq-main">{children}</div>
        <aside className="dq-pane" aria-label="Live example">
          <div className={`dq-sticky${previewOpen ? "" : " preview-closed"}`}>
            <button
              className="dq-preview-toggle"
              onClick={() => setPreviewOpen((v) => !v)}
            >
              <span className={`dq-chevron${previewOpen ? " open" : ""}`}>▸</span>{" "}
              Preview
              <span className="dq-renderer">
                {active.renderer === "kymo"
                  ? "rendered by kymo"
                  : "editor preview"}
              </span>
            </button>
            {previewOpen && (
              <div className="dq-preview">
                <div className="dq-preview-inner">
                  <img
                    ref={previewImg}
                    src={active.image}
                    alt={`Rendered ${active.label}`}
                    onLoad={(e) => applyCap(e.currentTarget)}
                  />
                </div>
              </div>
            )}
            <div className="dq-code">
              <div className="dq-code-head">
                <span className="dq-tab">{active.label}</span>
                <span className="dq-actions">
                  <button onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
                  <button onClick={openEditor}>▶ Open in editor</button>
                </span>
              </div>
              <pre className="dq-source">
                <code>
                  {lines.map((line, i) => (
                    <span
                      key={`${active.id}-${i}`}
                      className={`dq-line ${lineClass(i + 1)}`}
                    >
                      {line + "\n"}
                    </span>
                  ))}
                </code>
              </pre>
            </div>
          </div>
        </aside>
      </div>
    </DqContext.Provider>
  );
}
