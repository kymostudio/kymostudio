import { Layout as BaseLayout } from "@rspress/core/theme-original";
import { Footer } from "./Footer";

// Custom theme: the stock RSPress default theme + a global multi-column footer
// rendered on every page via the Layout `bottom` slot.
// NOTE: re-export from `@rspress/core/theme-original` (the real default theme),
// NOT `@rspress/core/theme` — inside a custom theme RSPress aliases the latter
// back to this file, so `export *` from it would self-reference (only `Layout`).
const Layout = () => <BaseLayout bottom={<Footer />} />;

export { Layout };
export * from "@rspress/core/theme-original";
