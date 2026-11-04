'use strict';
const api = window.latent;
const { SKINS, getSkin, drawPet, trickPose, use } = window.Sprites;
const { HOUSES, getHouse, drawHouse } = window.Houses;

const sizeName = s => s < 2.5 ? 'Small' : s < 3.5 ? 'Medium' : s < 4.5 ? 'Large' : s < 6 ? 'X-Large' : 'Huge';
let cfg = null;
let limits = { MAX_PETS: 8, MIN_SCALE: 1.5, MAX_SCALE: 10, fitScale: 10 };
let apps = [];
let pickingFor = -1;

// Animated previews: [{ canvas, skinId, hover }]
let previews = [];
function makePreview(skinId, w = 24, h = 32) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const p = { canvas: c, ctx: c.getContext('2d'), skinId, hover: false, start: 0, phase: Math.random() * 6 };
  c.addEventListener('mouseenter', () => { p.hover = true; p.start = performance.now() / 1000; });
  c.addEventListener('mouseleave', () => { p.hover = false; });
  previews.push(p);
  return p;
}
// House previews: [{ canvas, ctx, houseId, hover }]
let housePreviews = [];
function makeHousePreview(houseId) {
  const c = document.createElement('canvas');
  c.width = 136; c.height = 90;
  const p = { canvas: c, ctx: c.getContext('2d'), houseId, hover: false };
  housePreviews.push(p);
  return p;
}

function tick(now) {
  const t = now / 1000;
  housePreviews = housePreviews.filter(p => p.canvas.isConnected);
  const homeSkins = cfg ? cfg.pets.map(p => getSkin(p.skin)) : [];
  for (const p of housePreviews) {
    use(p.ctx);
    p.ctx.clearRect(0, 0, 136, 90);
    drawHouse(getHouse(p.houseId), 68, 87, { t, home: homeSkins, out: false, hot: p.hover, open: false });
  }
  previews = previews.filter(p => p.canvas.isConnected);
  for (const p of previews) {
    use(p.ctx);
    p.ctx.clearRect(0, 0, p.canvas.width, p.canvas.height);
    const skin = getSkin(p.skinId);
    const fy = p.canvas.height - 2;
    if (p.hover) {
      const o = trickPose(skin, t - p.start);
      drawPet(skin, 12 + o.dx, fy + Math.max(-8, o.dy), { ...o, t });
    } else {
      const blink = Math.floor(t + p.phase) % 4 === 0 && (t + p.phase) % 1 < 0.12;
      drawPet(skin, 12, fy - (Math.sin(t * 2.2 + p.phase) > 0 ? 1 : 0), { expr: blink ? 'blink' : 'normal', bob: Math.floor((t + p.phase) / 0.5) % 2, t });
    }
  }
  requestAnimationFrame(tick);
}

// ───────────── persistence ─────────────
let saveTimer = null;
function save(debounce = false) {
  clearTimeout(saveTimer);
  if (debounce) saveTimer = setTimeout(() => api.saveConfig(cfg), 250);
  else api.saveConfig(cfg);
}

// ───────────── rendering ─────────────
const $ = id => document.getElementById(id);
const isUrl = s => /^https?:\/\//i.test(s);
function targetStatus(t) {
  t = (t || '').trim();
  if (!t) return ['warn', 'Not set — this pet won\'t open anything'];
  if (isUrl(t)) return ['ok', 'Opens in your browser'];
  if (apps.some(a => a.toLowerCase() === t.toLowerCase())) return ['ok', 'App found'];
  return ['warn', 'App not found in /Applications — check the spelling'];
}
const cleanName = s => s.toUpperCase().replace(/[^A-Z0-9 !?.\-+]/g, '').slice(0, 10);

function renderScale() {
  const max = Math.max(limits.MIN_SCALE + 0.5, Math.min(limits.MAX_SCALE, limits.fitScale || limits.MAX_SCALE));
  $('scale').min = limits.MIN_SCALE; $('scale').max = max;
  $('scale').value = Math.min(cfg.scale, max);
  const shown = Math.min(cfg.scale, max);
  $('scaleLabel').textContent = `${sizeName(shown)} · ${shown.toFixed(1)}×`;
  $('fitNote').textContent = `The biggest size is limited by your screen height (${max.toFixed(1)}× with ${cfg.pets.length} pet${cfg.pets.length === 1 ? '' : 's'} in this house).`;
}

function renderHouse() {
  const h = getHouse(cfg.house);
  $('houseName').textContent = h.name;
  const box = $('houseLook');
  box.innerHTML = '';
  const pv = makeHousePreview(h.id);
  box.appendChild(pv.canvas);
}

function renderPets() {
  const list = $('pets');
  list.innerHTML = '';
  cfg.pets.forEach((pet, i) => {
    const row = document.createElement('div');
    row.className = 'pet';

    const look = document.createElement('button');
    look.className = 'look';
    look.title = 'Change look';
    const pv = makePreview(pet.skin);
    look.appendChild(pv.canvas);
    const cap = document.createElement('small');
    cap.textContent = getSkin(pet.skin).name;
    look.appendChild(cap);
    look.onclick = () => openPicker(i);

    const fields = document.createElement('div');
    fields.className = 'fields';
    const nameLbl = document.createElement('label');
    nameLbl.innerHTML = '<span>Name</span>';
    const name = document.createElement('input');
    name.type = 'text'; name.value = pet.name; name.maxLength = 10; name.placeholder = 'NAME';
    name.oninput = () => {
      const v = cleanName(name.value);
      if (v !== name.value) { const pos = name.selectionStart; name.value = v; name.setSelectionRange(pos, pos); }
      pet.name = v; save(true);
    };
    nameLbl.appendChild(name);

    const tLbl = document.createElement('label');
    tLbl.innerHTML = '<span>Opens</span>';
    const target = document.createElement('input');
    target.type = 'text'; target.value = pet.target; target.setAttribute('list', 'apps');
    target.placeholder = 'App name or https://…';
    const status = document.createElement('div');
    const setStatus = () => { const [k, msg] = targetStatus(target.value); status.className = 'status ' + k; status.textContent = msg; };
    target.oninput = () => { pet.target = target.value.trim(); setStatus(); save(true); };
    setStatus();
    tLbl.appendChild(target);
    fields.append(nameLbl, tLbl, status);

    const actions = document.createElement('div');
    actions.className = 'actions';
    const mk = (txt, title, fn, disabled) => {
      const b = document.createElement('button'); b.className = 'icon'; b.textContent = txt; b.title = title;
      b.disabled = !!disabled; b.onclick = fn; return b;
    };
    actions.append(
      mk('↑', 'Move up (higher in the stack)', () => move(i, -1), i === 0),
      mk('↓', 'Move down', () => move(i, 1), i === cfg.pets.length - 1),
      mk('✕', 'Remove', () => { cfg.pets.splice(i, 1); save(); renderPets(); renderScale(); }, cfg.pets.length <= 1),
    );

    row.append(look, fields, actions);
    list.appendChild(row);
  });
  $('add').disabled = cfg.pets.length >= limits.MAX_PETS;
}

function move(i, d) {
  const j = i + d;
  [cfg.pets[i], cfg.pets[j]] = [cfg.pets[j], cfg.pets[i]];
  save(); renderPets();
}

function openHousePicker() {
  $('pickerTitle').textContent = 'Choose a house';
  const grid = $('grid');
  grid.className = 'grid houses';
  grid.innerHTML = '';
  for (const h of HOUSES) {
    const tile = document.createElement('button');
    tile.className = 'tile' + (h.id === cfg.house ? ' sel' : '');
    const pv = makeHousePreview(h.id);
    tile.appendChild(pv.canvas);
    tile.appendChild(document.createTextNode(h.name));
    tile.onmouseenter = () => { pv.hover = true; };
    tile.onmouseleave = () => { pv.hover = false; };
    tile.onclick = () => { cfg.house = h.id; save(); $('picker').close(); renderHouse(); };
    grid.appendChild(tile);
  }
  $('picker').showModal();
}

function openPicker(i) {
  pickingFor = i;
  $('pickerTitle').textContent = 'Choose a look';
  const grid = $('grid');
  grid.className = 'grid';
  grid.innerHTML = '';
  for (const s of SKINS) {
    const tile = document.createElement('button');
    tile.className = 'tile' + (s.id === cfg.pets[i].skin ? ' sel' : '');
    const pv = makePreview(s.id);
    tile.appendChild(pv.canvas);
    tile.appendChild(document.createTextNode(s.name));
    tile.onmouseenter = () => { pv.hover = true; pv.start = performance.now() / 1000; };
    tile.onmouseleave = () => { pv.hover = false; };
    tile.onclick = () => {
      cfg.pets[pickingFor].skin = s.id;
      save();
      $('picker').close();
      renderPets();
    };
    grid.appendChild(tile);
  }
  $('picker').showModal();
}

// ───────────── wiring ─────────────
let scalePending = false;
$('scale').oninput = () => {
  cfg.scale = Math.round(Number($('scale').value) * 10) / 10;
  renderScale();
  if (!scalePending) { scalePending = true; requestAnimationFrame(() => { scalePending = false; save(); }); }
};
$('houseLook').onclick = openHousePicker;
$('changeHouse').onclick = openHousePicker;
api.onFit(f => { limits.fitScale = f; renderScale(); });
$('add').onclick = () => {
  if (cfg.pets.length >= limits.MAX_PETS) return;
  const used = new Set(cfg.pets.map(p => p.skin));
  const skin = (SKINS.find(s => !used.has(s.id)) || SKINS[0]).id;
  cfg.pets.push({ name: 'NEW PET', target: '', skin });
  save(); renderPets();
};
$('reset').onclick = () => api.resetConfig();
$('closePicker').onclick = () => $('picker').close();

api.onConfig(data => {
  // only re-render on external changes (e.g. reset) to avoid stealing focus while typing
  limits = data.limits || limits;
  if (JSON.stringify(data.config) !== JSON.stringify(cfg)) { cfg = data.config; renderScale(); renderHouse(); renderPets(); }
  else renderScale();
});

Promise.all([api.getConfig(), api.listApps()]).then(([data, list]) => {
  cfg = data.config;
  limits = data.limits || limits;
  apps = list;
  for (const a of apps) { const o = document.createElement('option'); o.value = a; $('apps').appendChild(o); }
  renderScale();
  renderHouse();
  renderPets();
  requestAnimationFrame(tick);
});
