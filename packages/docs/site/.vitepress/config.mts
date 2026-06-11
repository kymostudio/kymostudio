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
    siteTitle: "KymoStudio",
    nav: [
      { text: "Guide", link: "/guide/" },
      { text: "Diagrams", link: "/diagrams/flowchart" },
      { text: "Editor", link: "https://editor.kymo.studio" },
      { text: "Website", link: "https://kymo.studio" },
    ],
    sidebar: [
      {
        text: "Guide",
        items: [
          { text: "Introduction", link: "/guide/" },
          { text: "Getting Started", link: "/guide/getting-started" },
          { text: "The .kymo Language", link: "/guide/dsl-guide" },
          { text: "Cookbook", link: "/guide/cookbook" },
          { text: "FAQ & Troubleshooting", link: "/guide/faq" },
        ],
      },
      {
        text: "Diagrams",
        items: [
          { text: "Flowchart", link: "/diagrams/flowchart" },
          { text: "BPMN", link: "/diagrams/bpmn" },
          { text: "Best Practices", link: "/diagrams/best-practices" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/kymostudio/kymostudio" }],
    search: { provider: "local" },
    outline: { level: [2, 3] },
    footer: { message: "Apache 2.0 Licensed", copyright: "KymoStudio" },
  },
});
