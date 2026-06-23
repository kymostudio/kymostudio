import * as path from "node:path";
import { defineConfig } from "@rspress/core";

// KymoStudio docs — RSPress (React + MDX) on the brand palette (docs/brand).
// Two functions, two sidebars: User Guide (task-oriented authoring) lives under
// /guide, /diagrams, /layouts; Technical Documentation (grammar spec, format
// interop, MCP API) lives under /reference.

// User Guide — shared across /guide, /diagrams, /layouts.
const userGuideSidebar = [
  {
    text: "Guide",
    items: [
      { text: "Getting Started", link: "/guide/getting-started" },
      { text: "Best Practices", link: "/diagrams/best-practices" },
      { text: "FAQ & Troubleshooting", link: "/guide/faq" },
    ],
  },
  {
    text: "Diagrams",
    items: [
      { text: "Flowchart", link: "/diagrams/flowchart" },
      { text: "Sequence Diagram", link: "/diagrams/sequence" },
      { text: "Class Diagram", link: "/diagrams/class" },
      { text: "State Diagram", link: "/diagrams/state" },
      { text: "Entity Relationship", link: "/diagrams/er" },
      { text: "User Journey", link: "/diagrams/journey" },
      { text: "Gantt", link: "/diagrams/gantt" },
      { text: "Pie Chart", link: "/diagrams/pie" },
      { text: "Quadrant Chart", link: "/diagrams/quadrant" },
      { text: "Requirement Diagram", link: "/diagrams/requirement" },
      { text: "Git Graph", link: "/diagrams/gitgraph" },
      { text: "C4 Diagram", link: "/diagrams/c4" },
      { text: "Mindmap", link: "/diagrams/mindmap" },
      { text: "Timeline", link: "/diagrams/timeline" },
      { text: "Sankey", link: "/diagrams/sankey" },
      { text: "XY Chart", link: "/diagrams/xychart" },
      { text: "Block Diagram", link: "/diagrams/block" },
      { text: "Packet", link: "/diagrams/packet" },
      { text: "Kanban", link: "/diagrams/kanban" },
      { text: "Architecture", link: "/diagrams/architecture" },
      { text: "Radar", link: "/diagrams/radar" },
      { text: "Treemap", link: "/diagrams/treemap" },
    ],
  },
  {
    text: "Layouts",
    items: [
      { text: "Overview", link: "/layouts/" },
      { text: "Layered (Dagre)", link: "/layouts/dagre" },
      { text: "Layered (Sugiyama)", link: "/layouts/layered" },
      { text: "Grid", link: "/layouts/grid" },
      { text: "Force-directed", link: "/layouts/force" },
    ],
  },
];

// Technical Documentation — reference & spec for devs/integrators.
const referenceSidebar = [
  {
    text: "Reference",
    items: [
      { text: "The .kymo Language", link: "/reference/dsl" },
      { text: "BPMN", link: "/reference/bpmn" },
      { text: "Flowchart Notation", link: "/reference/flowchart-notation" },
      { text: "MCP Server", link: "/reference/mcp" },
    ],
  },
];

export default defineConfig({
  root: path.join(__dirname, "docs"),
  outDir: path.join(__dirname, "doc_build"),
  title: "KymoStudio",
  description:
    "Diagram superpowers — documentation for the kymo diagram-as-code DSL.",
  lang: "en",
  icon: "/favicon.svg",
  logo: "/logo.svg",
  logoText: "KymoStudio",
  globalStyles: path.join(__dirname, "theme/styles.css"),
  builderConfig: {
    resolve: {
      alias: { "@components": path.join(__dirname, "theme/components.ts") },
    },
  },
  route: { cleanUrls: true },
  // Phased migration: some target pages (the 22 diagram quickstarts, dagre demo)
  // land in Phase 2, and many spec pages link out to GitHub raw assets — keep the
  // dead-link/image checker quiet (mirrors the old VitePress `ignoreDeadLinks`).
  markdown: {
    link: { checkDeadLinks: false },
    image: { checkDeadImages: false },
  },
  themeConfig: {
    enableContentAnimation: true,
    outlineTitle: "On this page",
    nav: [
      {
        text: "Guide",
        link: "/guide/getting-started",
        activeMatch: "^/(guide|diagrams|layouts)/",
      },
      { text: "Reference", link: "/reference/dsl", activeMatch: "^/reference/" },
      { text: "Editor", link: "https://editor.kymo.studio" },
      { text: "Website", link: "https://kymo.studio" },
    ],
    sidebar: {
      "/guide/": userGuideSidebar,
      "/diagrams/": userGuideSidebar,
      "/layouts/": userGuideSidebar,
      "/reference/": referenceSidebar,
    },
    socialLinks: [
      {
        icon: "github",
        mode: "link",
        content: "https://github.com/kymostudio/kymostudio",
      },
    ],
  },
});
