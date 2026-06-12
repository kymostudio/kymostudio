import { defineConfig } from "vitepress";

// KymoStudio docs — VitePress on the brand palette (docs/brand), in the same
// spirit as the Mermaid open-source docs.
export default defineConfig({
  title: "KymoStudio",
  description: "Diagram superpowers — documentation for the kymo diagram-as-code DSL.",
  lang: "en-US",
  // Copied markdown links into the wider monorepo (../../packages, ../formats)
  // don't exist inside the published subset.
  ignoreDeadLinks: true,
  head: [["link", { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }]],
  themeConfig: {
    logo: "/logo.svg",
    // No landing page — the brand mark goes straight to the guide.
    logoLink: "/guide/getting-started",
    siteTitle: "KymoStudio",
    nav: [
      { text: "Editor", link: "https://editor.kymo.studio" },
      { text: "Website", link: "https://kymo.studio" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "MCP Server", link: "/guide/mcp" },
        ],
      },
      {
        text: "Diagrams",
        items: [
          { text: "Flowchart", link: "/diagrams/flowchart" },
          { text: "Sequence Diagram", link: "/diagrams/sequence" },
          { text: "Class Diagram", link: "/diagrams/class" },
        ],
      },
      {
        text: "References",
        items: [
          { text: "The .kymo Language", link: "/guide/dsl-guide" },
          { text: "BPMN", link: "/diagrams/bpmn" },
          { text: "Best Practices", link: "/diagrams/best-practices" },
          { text: "Flowchart Notation", link: "/diagrams/flowchart-notation" },
          { text: "FAQ & Troubleshooting", link: "/guide/faq" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/kymostudio/kymostudio" }],
    search: { provider: "local" },
    outline: { level: [2, 3] },
    footer: { message: "Apache 2.0 Licensed", copyright: "KymoStudio" },
  },
});
