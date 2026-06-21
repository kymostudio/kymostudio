import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Admin } from "./Admin";
import { BrandPage } from "./Brand";
import { IconPage } from "./Icon";

// Tiny path-based routing. /login + /admin → admin surface; /brand/<slug> → a
// brand page; /icon/<slug> → a per-icon page; /set/<set>[/<subset>] + everything
// else → the gallery (it reads the set/subset from the path).
// Cloudflare Pages rewrites unknown paths → index.html (_redirects: /* /index.html 200).
const path = location.pathname.replace(/\/+$/, "");
const Root = path === "/login" || path === "/admin" ? Admin
  : path.startsWith("/brand/") ? BrandPage
    : path.startsWith("/icon/") ? IconPage
      : App;

createRoot(document.getElementById("root")!).render(<Root />);
