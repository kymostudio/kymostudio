import { useContext, useEffect, useRef, type MouseEvent, type ReactNode } from "react";
import { DqContext } from "./DiagramQuickstart";
import { ALL, editorUrl } from "./examples";

// Stripe-style step card: wraps one doc section, registers itself for scroll-spy,
// activates on click (highlighting the matching code lines in the sticky pane),
// and renders the example inline on narrow screens.
export function DqSection({
  id,
  children,
}: {
  id: string;
  children?: ReactNode;
}) {
  const ctx = useContext(DqContext);
  const root = useRef<HTMLElement>(null);

  useEffect(() => {
    if (root.current) ctx?.register(id, root.current);
    return () => ctx?.unregister(id);
    // ctx.register/unregister all close over the same markers ref — safe to
    // run once per id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isActive = ctx?.activeId === id;
  const ex = ALL[id];

  const onClick = (event: MouseEvent) => {
    // Plain links inside the card keep their behaviour.
    if ((event.target as HTMLElement).closest("a")) return;
    ctx?.activate(id);
  };
  const openEditor = async () => {
    if (ex) window.open(await editorUrl(ex.code), "_blank", "noopener");
  };

  return (
    <section
      ref={root}
      className={`dq-section${isActive ? " active" : ""}`}
      onClick={onClick}
    >
      {children}
      {ex && (
        <div className="dq-inline">
          <pre className="dq-inline-code">
            <code>{ex.code}</code>
          </pre>
          <p className="dq-inline-try">
            <a
              href="#"
              onClick={(e) => {
                e.preventDefault();
                openEditor();
              }}
            >
              ▶ Try it in the editor
            </a>
          </p>
          <img src={ex.image} alt={`Rendered ${ex.label}`} loading="lazy" />
        </div>
      )}
    </section>
  );
}
