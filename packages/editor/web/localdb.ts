// Local "dev DB": when the editor runs on localhost there is no kymo-mcp worker
// (and the fake Dev-login token would be 401'd by the real one anyway), so save /
// list / rooms have nowhere to go. This module stands in for the whole backend
// using the browser's localStorage:
//   • installLocalApi() patches window.fetch to serve the REST data API
//     (/api/diagrams · /api/workspaces · /api/projects · /api/trash) from the
//     store, matching the worker's JSON shapes 1:1.
//   • the document itself (source + title + kind) is read/written through the
//     localGet/localSet helpers below — room.ts uses them instead of a WebSocket.
// Production is untouched: this only activates on localhost, and only intercepts
// the data-API paths (renders still hit render.kymo.studio for real).
import { isLocalhost } from "./auth";
import { newId } from "./util";

// Active on localhost only — and never under the e2e suite, which sets the flag
// below so its Playwright `page.route` stubs (not localStorage) serve the API.
export const LOCAL = isLocalhost() && !(typeof window !== "undefined" && (window as any).__kymoNoLocalDb);

type LDiagram = { id: string; title: string; kind: string; source: string; ws: string; project: string; updatedAt: number; deleted?: number };
type LFolder = { id: string; name: string; parentId: string; project: string; createdAt: number; deleted?: number };
type LProject = { id: string; name: string; createdAt: number; deleted?: number };
type Store = { projects: LProject[]; folders: LFolder[]; diagrams: LDiagram[] };

const KEY = "kymo_localdb";
let SEQ = 0; // monotonic tiebreaker so same-ms writes still order deterministically

function load(): Store {
  try {
    const s = JSON.parse(localStorage.getItem(KEY) || "");
    if (s && Array.isArray(s.projects) && Array.isArray(s.folders) && Array.isArray(s.diagrams)) return s;
  } catch {}
  return { projects: [], folders: [], diagrams: [] };
}
function save(s: Store) { try { localStorage.setItem(KEY, JSON.stringify(s)); } catch {} }
function stamp() { return Date.now() * 1000 + (SEQ++ % 1000); }

// The user always has at least one project ("Personal"), like the worker's
// ensureDefaultProject — create it lazily on first read.
function ensureDefaultProject(s: Store): LProject {
  let p = s.projects.filter((x) => !x.deleted).sort((a, b) => a.createdAt - b.createdAt)[0];
  if (!p) { p = { id: newId(), name: "Personal", createdAt: stamp() }; s.projects.push(p); save(s); }
  return p;
}
function resolveProject(s: Store, id: string | null): LProject {
  const live = s.projects.filter((x) => !x.deleted);
  return (id && live.find((p) => p.id === id)) || ensureDefaultProject(s);
}

// ---- document helpers used by room.ts (the live source/title/kind) ----
export function localGetDoc(id: string): { source: string; title?: string; kind?: string } | null {
  const d = load().diagrams.find((x) => x.id === id && !x.deleted);
  return d ? { source: d.source, title: d.title && d.title !== "Untitled" ? d.title : undefined, kind: d.kind } : null;
}
export function localSetSource(id: string, source: string, kind?: string) {
  const s = load();
  let d = s.diagrams.find((x) => x.id === id);
  if (!d) { d = { id, title: "Untitled", kind: kind || "kymo", source: "", ws: "", project: ensureDefaultProject(s).id, updatedAt: 0 }; s.diagrams.push(d); }
  d.source = source; if (kind) d.kind = kind; d.deleted = undefined; d.updatedAt = stamp();
  save(s);
}
export function localSetTitle(id: string, title: string) {
  const s = load();
  const d = s.diagrams.find((x) => x.id === id);
  if (!d) return;
  d.title = (title || "").trim().slice(0, 60) || "Untitled"; d.updatedAt = stamp();
  save(s);
}

// ---- REST data API, served from the store (shapes mirror packages/mcp) ----
const json = (body: any, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

function handle(method: string, u: URL, body: any): Response | null {
  const path = u.pathname;
  const q = (k: string) => u.searchParams.get(k);
  const s = load();

  // thumbnails aren't generated locally — the Explorer falls back to an icon
  if (path === "/api/diagrams/thumb") return new Response("no thumb", { status: 404 });

  if (path === "/api/projects") {
    if (method === "GET") { ensureDefaultProject(s); return json({ projects: load().projects.filter((p) => !p.deleted).map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt })) }); }
    if (method === "POST") { const p: LProject = { id: newId(), name: (body?.name || "").trim().slice(0, 40) || "Project", createdAt: stamp() }; s.projects.push(p); save(s); return json({ project: { id: p.id, name: p.name, createdAt: p.createdAt } }); }
    if (method === "PATCH") { const p = s.projects.find((x) => x.id === body?.id); if (p) { p.name = (body.name || "").trim().slice(0, 40) || p.name; save(s); } return json({ ok: true }); }
    if (method === "DELETE") { const id = q("id") || ""; if (s.projects.filter((x) => !x.deleted).length <= 1) return json({ error: "last project" }, 400); const p = s.projects.find((x) => x.id === id); if (p) { p.deleted = stamp(); s.folders.forEach((f) => { if (f.project === id) f.deleted = p!.deleted; }); s.diagrams.forEach((d) => { if (d.project === id) d.deleted = p!.deleted; }); save(s); } return json({ ok: true }); }
  }

  if (path === "/api/workspaces") {
    const proj = resolveProject(s, q("project"));
    if (method === "GET") return json({ workspaces: s.folders.filter((f) => !f.deleted && f.project === proj.id).map((f) => ({ id: f.id, name: f.name, parentId: f.parentId, createdAt: f.createdAt })) });
    if (method === "POST") { const f: LFolder = { id: newId(), name: (body?.name || "").trim().slice(0, 60) || "Folder", parentId: body?.parentId || "", project: proj.id, createdAt: stamp() }; s.folders.push(f); save(s); return json({ workspace: { id: f.id, name: f.name, parentId: f.parentId, createdAt: f.createdAt } }); }
    if (method === "PATCH") { const f = s.folders.find((x) => x.id === body?.id); if (f) { if (body.name !== undefined) f.name = (body.name || "").trim().slice(0, 60) || f.name; if (body.parentId !== undefined) f.parentId = body.parentId || ""; save(s); } return json({ ok: true }); }
    if (method === "DELETE") { const id = q("id") || ""; const f = s.folders.find((x) => x.id === id); if (f) { f.deleted = stamp(); save(s); } return json({ ok: true }); }
  }

  if (path === "/api/trash") {
    if (method === "GET") return json({
      diagrams: s.diagrams.filter((d) => d.deleted).map((d) => ({ id: d.id, title: d.title, kind: d.kind, deletedAt: d.deleted })),
      folders: s.folders.filter((f) => f.deleted).map((f) => ({ id: f.id, name: f.name, deletedAt: f.deleted })),
      projects: s.projects.filter((p) => p.deleted).map((p) => ({ id: p.id, name: p.name, deletedAt: p.deleted })),
    });
    if (method === "POST") { const { kind, id } = body || {}; const coll = kind === "diagram" ? s.diagrams : kind === "folder" ? s.folders : s.projects; const it = (coll as any[]).find((x) => x.id === id); if (it) { it.deleted = undefined; save(s); } return json({ ok: true }); }
    if (method === "DELETE") {
      if (q("all")) { s.diagrams = s.diagrams.filter((d) => !d.deleted); s.folders = s.folders.filter((f) => !f.deleted); s.projects = s.projects.filter((p) => !p.deleted); save(s); return json({ ok: true }); }
      const id = q("id") || ""; const kind = q("kind");
      if (kind === "project") { s.projects = s.projects.filter((p) => p.id !== id); s.folders = s.folders.filter((f) => f.project !== id); s.diagrams = s.diagrams.filter((d) => d.project !== id); }
      else if (kind === "folder") { s.folders = s.folders.filter((f) => f.id !== id); }
      else { s.diagrams = s.diagrams.filter((d) => d.id !== id); }
      save(s); return json({ ok: true });
    }
  }

  if (path === "/api/diagrams") {
    if (method === "DELETE") { const id = q("id") || ""; const d = s.diagrams.find((x) => x.id === id); if (d) { d.deleted = stamp(); save(s); } return json({ ok: true }); }
    if (method === "PATCH") {
      const { id, ws, title, project } = body || {};
      if (!id) return json({ error: "missing id" }, 400);
      let d = s.diagrams.find((x) => x.id === id);
      if (!d) { d = { id, title: "Untitled", kind: "kymo", source: "", ws: "", project: ensureDefaultProject(s).id, updatedAt: stamp() }; s.diagrams.push(d); }
      if (title !== undefined) d.title = (title || "").trim().slice(0, 60) || "Untitled";
      if (project !== undefined && project) { d.project = resolveProject(s, project).id; if (ws === undefined) d.ws = ""; }
      if (ws !== undefined) d.ws = ws || "";
      d.updatedAt = stamp(); save(s); return json({ ok: true });
    }
    // search
    const search = q("q");
    if (search !== null) {
      const needle = search.trim().toLowerCase();
      if (!needle) return json({ diagrams: [] });
      const hits = s.diagrams.filter((d) => !d.deleted && (d.title + " " + d.source + " " + d.kind).toLowerCase().includes(needle))
        .sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 50);
      return json({ diagrams: hits.map((d) => ({ id: d.id, title: d.title, kind: d.kind })) });
    }
    // list (scoped to the resolved project)
    const proj = resolveProject(s, q("project"));
    const diagrams = s.diagrams.filter((d) => !d.deleted && (d.project === proj.id || !d.project))
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map((d) => ({ id: d.id, title: d.title, updatedAt: d.updatedAt, kind: d.kind, ws: d.ws, hasThumb: false }));
    const workspaces = s.folders.filter((f) => !f.deleted && f.project === proj.id).map((f) => ({ id: f.id, name: f.name, parentId: f.parentId, createdAt: f.createdAt }));
    const projects = s.projects.filter((p) => !p.deleted).map((p) => ({ id: p.id, name: p.name, createdAt: p.createdAt }));
    return json({ email: "dev@localhost", diagrams, workspaces, projects, project: proj.id });
  }
  return null;
}

const DATA_PATH = /^\/api\/(diagrams|workspaces|projects|trash)(\/thumb)?$/;

export function installLocalApi() {
  if (!LOCAL) return;
  const orig = window.fetch.bind(window);
  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    try {
      const ref = typeof input === "string" || input instanceof URL ? String(input) : input.url;
      const u = new URL(ref, location.href);
      if (DATA_PATH.test(u.pathname)) {
        const method = (init?.method || (input instanceof Request ? input.method : "GET")).toUpperCase();
        if (method === "OPTIONS") return new Response(null, { status: 204 });
        let body: any;
        const raw = init?.body;
        if (typeof raw === "string") { try { body = JSON.parse(raw); } catch {} }
        const res = handle(method, u, body);
        if (res) return res;
      }
    } catch {}
    return orig(input as any, init);
  };
}
