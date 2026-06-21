import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Admin } from "./Admin";
import { BrandPage } from "./Brand";

// Tiny path-based routing. /login + /admin → admin surface; /brand/<set>/<slug>
// → a dedicated brand page; everything else → the gallery. Cloudflare Pages
// rewrites unknown paths → index.html (_redirects: /* /index.html 200).
const path = location.pathname.replace(/\/+$/, "");
const Root = path === "/login" || path === "/admin" ? Admin
  : path.startsWith("/brand/") ? BrandPage
    : App;

createRoot(document.getElementById("root")!).render(<Root />);
