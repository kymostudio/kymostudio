// Multi-column site footer, rendered globally on every docs page.
// Content mirrors the kymo.studio landing footer (registries + GitHub + license)
// so the three sites stay consistent. Styling uses the RSPress design tokens
// (see styles.css) so it follows light/dark automatically.

const GH = "https://github.com/kymostudio/kymostudio";

const COLUMNS: { title: string; links: { text: string; href: string }[] }[] = [
  {
    title: "Product",
    links: [
      { text: "Editor", href: "https://editor.kymo.studio" },
      { text: "Playground", href: "https://kymo.studio/app/" },
      { text: "Icons", href: "https://icons.kymo.studio" },
      { text: "Website", href: "https://kymo.studio" },
    ],
  },
  {
    title: "Documentation",
    links: [
      { text: "Getting Started", href: "/guide/getting-started" },
      { text: "The .kymo Language", href: "/reference/dsl" },
      { text: "BPMN", href: "/reference/bpmn" },
      { text: "MCP Server", href: "/reference/mcp" },
    ],
  },
  {
    title: "Packages",
    links: [
      { text: "npm", href: "https://www.npmjs.com/package/kymostudio" },
      { text: "PyPI", href: "https://pypi.org/project/kymostudio/" },
      { text: "crates.io", href: "https://crates.io/crates/kymostudio" },
      {
        text: "VS Code",
        href: "https://marketplace.visualstudio.com/items?itemName=kymostudio.kymostudio-vscode",
      },
    ],
  },
];

function isExternal(href: string) {
  return href.startsWith("http");
}

export function Footer() {
  return (
    <footer className="k-footer">
      <div className="k-footer-inner">
        <div className="k-footer-grid">
          <div className="k-footer-brand">
            <a className="k-footer-logo" href="/guide/getting-started">
              <img src="/logo.svg" alt="KymoStudio" width={28} height={28} />
              <span>KymoStudio</span>
            </a>
            <p className="k-footer-tagline">
              Diagram-as-code — declarative source compiled to animated SVG,
              Figma, Excalidraw &amp; WebP.
            </p>
            <a
              className="k-footer-social"
              href={GH}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="currentColor"
                  d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.33-1.76-1.33-1.76-1.09-.74.08-.73.08-.73 1.2.09 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.5.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.13-.31-.54-1.53.12-3.19 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.25 2.88.12 3.19.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.21.7.82.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5Z"
                />
              </svg>
            </a>
          </div>

          {COLUMNS.map((col) => (
            <div className="k-footer-col" key={col.title}>
              <h4>{col.title}</h4>
              <ul>
                {col.links.map((l) => (
                  <li key={l.href}>
                    {isExternal(l.href) ? (
                      <a href={l.href} target="_blank" rel="noopener noreferrer">
                        {l.text}
                      </a>
                    ) : (
                      <a href={l.href}>{l.text}</a>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="k-footer-bottom">
          <span>© 2026 KymoStudio · Apache 2.0 Licensed</span>
          <a href={GH} target="_blank" rel="noopener noreferrer">
            github.com/kymostudio/kymostudio
          </a>
        </div>
      </div>
    </footer>
  );
}
