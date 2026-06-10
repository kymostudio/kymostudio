// /diagrams — lists the signed-in user's diagrams via the kymo-mcp Worker.
const GOOGLE_CLIENT_ID = "745071116390-6idggmrtohc6heg6gvuubaamkt8dr68u.apps.googleusercontent.com";
const API = "https://mcp.kymo.studio/api/diagrams";
const $ = (id) => document.getElementById(id);

function token() { try { return localStorage.getItem("kymo_idtoken"); } catch { return null; } }
function jwtField(jwt, f) { try { return JSON.parse(atob(jwt.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")))[f]; } catch { return null; } }
function tokenValid(t) { const e = t && jwtField(t, "exp"); return !!(e && e * 1000 > Date.now() + 30000); }
function esc(s) { return String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c])); }
function fmt(ms) { try { return new Date(ms).toLocaleString(); } catch { return ""; } }

async function loadList(t) {
  $("status").textContent = "Loading…";
  try {
    const r = await fetch(API + "?id_token=" + encodeURIComponent(t));
    if (!r.ok) {
      if (r.status === 401) { signedOut(); return; }
      $("status").textContent = "Error " + r.status; return;
    }
    const j = await r.json();
    $("email").textContent = j.email || "";
    render(j.diagrams || []);
  } catch (e) { $("status").textContent = "Error: " + e.message; }
}

function render(list) {
  list.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  if (!list.length) { $("list").innerHTML = ""; $("status").textContent = "No diagrams yet — create one."; return; }
  $("status").textContent = list.length + " diagram" + (list.length > 1 ? "s" : "");
  $("list").innerHTML = list.map((d) =>
    `<a class="row" href="/?d=${encodeURIComponent(d.id)}"><span class="title">${esc(d.title || "Untitled")}</span><span class="meta">${esc(d.id)} · ${fmt(d.updatedAt)}</span></a>`
  ).join("");
}

function signedIn(t) {
  $("signin").hidden = true; $("app").hidden = false;
  for (const id of ["email", "refresh", "newbtn", "signout"]) $(id).hidden = false;
  loadList(t);
}
function signedOut() {
  $("app").hidden = true; $("signin").hidden = false;
  for (const id of ["email", "refresh", "newbtn", "signout"]) $(id).hidden = true;
  $("email").textContent = "";
  initGoogle();
}

function onCredential(resp) { try { localStorage.setItem("kymo_idtoken", resp.credential); } catch {} signedIn(resp.credential); }
let gInit = false;
function initGoogle() {
  if (!window.google || !google.accounts || !google.accounts.id) { setTimeout(initGoogle, 150); return; }
  if (!gInit) { google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: onCredential, auto_select: true }); gInit = true; }
  google.accounts.id.renderButton($("gbtn"), { type: "standard", theme: "filled_black", size: "large", text: "signin_with" });
  google.accounts.id.prompt();
}

$("newbtn").addEventListener("click", () => {
  const id = (self.crypto && crypto.randomUUID) ? crypto.randomUUID().slice(0, 8) : Math.random().toString(36).slice(2, 10);
  location.href = "/?d=" + id;
});
$("refresh").addEventListener("click", () => { const t = token(); if (tokenValid(t)) loadList(t); });
$("signout").addEventListener("click", () => {
  try { localStorage.removeItem("kymo_idtoken"); } catch {}
  if (window.google && google.accounts && google.accounts.id) google.accounts.id.disableAutoSelect();
  signedOut();
});

const t = token();
if (tokenValid(t)) signedIn(t); else signedOut();
