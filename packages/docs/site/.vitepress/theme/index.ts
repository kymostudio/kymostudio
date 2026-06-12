import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import DiagramQuickstart from "./DiagramQuickstart.vue";
import DqSection from "./DqSection.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("DiagramQuickstart", DiagramQuickstart);
    app.component("DqSection", DqSection);
  },
} satisfies Theme;
