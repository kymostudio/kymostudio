import { createRoot, hydrateRoot } from "react-dom/client";
import { App } from "./App";
import { Admin } from "./Admin";
import { BrandPage } from "./Brand";
import { IconPage } from "./Icon";
import { LangProvider, splitLocale, clientInitialLang } from "./i18n";

// Locale is a path prefix (/vi, /zh); strip it to the LOGICAL path, then do the
// tiny path-based routing. /login + /admin → admin surface; /brand/<slug> → a
// brand page; /icon/<slug> → a per-icon page; /set/<set>[/<subset>] + everything
// else → the gallery (it reads set/subset from the logical path).
// The home gallery is prerendered per locale (/, /vi/, /zh/); deep routes fall
// back to the empty app.html shell (Cloudflare _redirects).
const { rest } = splitLocale(location.pathname);
const Root = rest === "/login" || rest === "/admin" ? Admin
  : rest.startsWith("/brand/") ? BrandPage
    : rest.startsWith("/icon/") ? IconPage
      : App;

const container = document.getElementById("root")!;
const tree = (
  <LangProvider initialLang={clientInitialLang()}>
    <Root />
  </LangProvider>
);
// Prerendered shells (home /, /vi/, /zh/) ship baked markup → hydrate; the empty
// app.html fallback served for deep routes has none → fresh client render.
if (container.firstChild) hydrateRoot(container, tree);
else createRoot(container).render(tree);
