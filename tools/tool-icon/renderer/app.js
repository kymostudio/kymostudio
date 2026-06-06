// Renderer logic: drive the Iconify search API, render candidates, and track
// one chosen icon per concept. Disk I/O goes through the local server's
// /concepts.json and /api/selections endpoints (see server.js).

const SEARCH_URL = 'https://api.iconify.design/search';
const SEARCH_LIMIT = 120;

const el = (id) => document.getElementById(id);

let config = null;            // concepts.json
let selections = {};          // { "ai:<key>": { iconify, ok, note } }
let current = 0;              // index into config.concepts
let lastResults = [];         // icon names of the current search

const addrOf = (c) => `${config.set}:${c.key}`;

// ── Whole-page theme (light / dark) ──────────────────────────────────────
function applyTheme(theme) {
  document.documentElement.dataset.theme = theme;
  try { localStorage.setItem('tool-icon-theme', theme); } catch { /* ignore */ }
  const btn = el('themeBtn');
  if (btn) btn.textContent = theme === 'light' ? '☾ Tối' : '☀ Sáng';
}
function initTheme() {
  let theme = 'dark';
  try { theme = localStorage.getItem('tool-icon-theme') || 'dark'; } catch { /* ignore */ }
  applyTheme(theme);
}
initTheme(); // apply ASAP, before data loads

async function init() {
  config = await fetch('/concepts.json').then((r) => r.json());
  selections = await fetch('/api/selections').then((r) => r.json()).catch(() => ({}));

  renderConceptList();
  bindEvents();
  selectConcept(0);
}

function bindEvents() {
  el('searchBtn').addEventListener('click', () => doSearch(el('searchInput').value));
  el('searchInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doSearch(el('searchInput').value);
  });
  el('darkToggle').addEventListener('change', () => {
    el('results').classList.toggle('dark', el('darkToggle').checked);
  });
  el('themeBtn').addEventListener('click', () => {
    const next = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
    applyTheme(next);
  });
  el('saveBtn').addEventListener('click', save);
  el('clearBtn').addEventListener('click', () => selectIcon(null));
  el('okCheck').addEventListener('change', () => {
    const sel = selections[addrOf(config.concepts[current])];
    if (sel) { sel.ok = el('okCheck').checked; renderConceptList(); updateProgress(); }
  });
  el('noteInput').addEventListener('input', () => {
    const sel = selections[addrOf(config.concepts[current])];
    if (sel) sel.note = el('noteInput').value;
  });
}

function renderConceptList() {
  const list = el('conceptList');
  list.innerHTML = '';
  config.concepts.forEach((c, i) => {
    const sel = selections[addrOf(c)];
    const row = document.createElement('div');
    row.className = 'concept' + (i === current ? ' active' : '');
    row.addEventListener('click', () => selectConcept(i));

    const thumb = document.createElement('div');
    if (sel && sel.iconify) {
      thumb.className = 'thumb';
      const ic = document.createElement('iconify-icon');
      ic.setAttribute('icon', sel.iconify);
      ic.setAttribute('width', '20');
      thumb.appendChild(ic);
    } else {
      thumb.className = 'thumb empty';
      thumb.textContent = '?';
    }

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.innerHTML = `<div class="name">${c.label}</div>` +
      `<div class="addr">${sel && sel.iconify ? sel.iconify : addrOf(c)}</div>`;

    const dot = document.createElement('div');
    dot.className = 'dot' + (sel && sel.ok ? ' ok' : '');

    row.append(thumb, meta, dot);
    list.appendChild(row);
  });
}

function selectConcept(i) {
  current = i;
  const c = config.concepts[i];
  el('conceptLabel').textContent = `${c.label}  →  ${addrOf(c)}`;
  el('conceptDesc').textContent = c.desc;

  // seed chips
  const seedRow = el('seedRow');
  seedRow.innerHTML = '';
  c.keywords.forEach((kw) => {
    const chip = document.createElement('span');
    chip.className = 'seed';
    chip.textContent = kw;
    chip.addEventListener('click', () => doSearch(kw));
    seedRow.appendChild(chip);
  });

  renderConceptList();
  updateDetail();
  doSearch(c.keywords[0]); // auto-search the first keyword
}

async function doSearch(query) {
  query = (query || '').trim();
  el('searchInput').value = query;
  if (!query) return;
  const status = el('resultsStatus');
  status.textContent = `Đang tìm “${query}”…`;
  el('results').innerHTML = '';
  try {
    const url = `${SEARCH_URL}?query=${encodeURIComponent(query)}&limit=${SEARCH_LIMIT}`;
    const res = await fetch(url);
    const data = await res.json();
    lastResults = data.icons || [];
    renderResults(lastResults);
    status.textContent = lastResults.length
      ? `${lastResults.length} kết quả cho “${query}”`
      : `Không có kết quả cho “${query}”`;
  } catch (err) {
    status.textContent = `Lỗi tìm kiếm: ${err.message} (kiểm tra mạng tới api.iconify.design)`;
  }
}

function renderResults(icons) {
  const grid = el('results');
  grid.innerHTML = '';
  const sel = selections[addrOf(config.concepts[current])];
  icons.forEach((name) => {
    const cell = document.createElement('div');
    cell.className = 'cell' + (sel && sel.iconify === name ? ' selected' : '');
    cell.title = name;
    cell.addEventListener('click', () => selectIcon(name));

    const ic = document.createElement('iconify-icon');
    ic.setAttribute('icon', name);

    const label = document.createElement('div');
    label.className = 'cname';
    label.textContent = name;

    cell.append(ic, label);
    grid.appendChild(cell);
  });
}

function selectIcon(name) {
  const addr = addrOf(config.concepts[current]);
  if (name) {
    const prev = selections[addr] || { ok: true, note: '' };
    selections[addr] = { iconify: name, ok: prev.ok, note: prev.note };
  } else {
    delete selections[addr];
  }
  renderResults(lastResults); // refresh selected highlight
  renderConceptList();
  updateDetail();
  updateProgress();
}

function updateDetail() {
  const sel = selections[addrOf(config.concepts[current])];
  const name = sel && sel.iconify;
  for (const id of ['prevLight', 'prevDark']) {
    const node = el(id);
    if (name) node.setAttribute('icon', name);
    else node.removeAttribute('icon');
  }
  el('selAddr').textContent = name ? name : 'chưa chọn';
  el('okCheck').checked = !!(sel && sel.ok);
  el('noteInput').value = (sel && sel.note) || '';
}

function updateProgress() {
  const total = config.concepts.length;
  const picked = config.concepts.filter((c) => selections[addrOf(c)]).length;
  const ok = config.concepts.filter((c) => selections[addrOf(c)]?.ok).length;
  el('progress').textContent = `${picked}/${total} đã chọn · ${ok} hợp lý`;
}

async function save() {
  // Stable order: follow concepts.json
  const ordered = {};
  for (const c of config.concepts) {
    const sel = selections[addrOf(c)];
    if (sel) ordered[addrOf(c)] = { iconify: sel.iconify, ok: !!sel.ok, note: sel.note || '' };
  }
  try {
    const { path } = await fetch('/api/selections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(ordered),
    }).then((r) => r.json());
    el('saveStatus').textContent = `Đã lưu → ${path}`;
  } catch (err) {
    el('saveStatus').textContent = `Lỗi lưu: ${err.message}`;
  }
  setTimeout(() => { el('saveStatus').textContent = ''; }, 5000);
}

init();
