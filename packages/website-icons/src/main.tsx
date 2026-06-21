import { createRoot } from "react-dom/client";
import { App } from "./App";
import { Admin } from "./Admin";

// Tiny path-based routing — /login (and /admin) render the admin surface; the
// rest is the gallery. Cloudflare Pages rewrites /login → index.html (_redirects).
const path = location.pathname.replace(/\/+$/, "");
const Root = path === "/login" || path === "/admin" ? Admin : App;

createRoot(document.getElementById("root")!).render(<Root />);
