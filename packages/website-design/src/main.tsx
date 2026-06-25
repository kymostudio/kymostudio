import { hydrateRoot } from "react-dom/client";
import { App, splitLocale } from "./App";

// The brand & design-system surface is prerendered into one static HTML per
// locale × page (see prerender.mjs); this file HYDRATES whichever page was
// served. Locale + logical path both come from the URL so the client's first
// render matches the prerendered markup.
const { lang, rest } = splitLocale(window.location.pathname);
hydrateRoot(
  document.getElementById("root")!,
  <App initialLang={lang} initialPath={rest} />,
);
