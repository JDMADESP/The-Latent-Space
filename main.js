// The Latent Space — a pixel nightclub full of AI desktop pets.
const { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage, shell } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

app.setName('The Latent Space');

// Default crew. If the desktop app isn't installed, the pet opens the web version instead.
const DEFAULT_PETS = [
  { name: 'CHATGPT', app: 'ChatGPT', url: 'https://chatgpt.com', skin: 'cloudy' },
  { name: 'CLAUDE', app: 'Claude', url: 'https://claude.ai', skin: 'spark' },
  { name: 'MUSE', app: 'Muse', url: 'https://www.meta.ai', skin: 'beats' },
  { name: 'GROK', app: 'Grok', url: 'https://grok.com', skin: 'slash' },
];
const MAX_PETS = 8;
const MIN_SCALE = 1.5, MAX_SCALE = 10;
let fitScale = MAX_SCALE; // largest size that fits on screen, reported by the pet window

let win = null;
let settingsWin = null;
let tray = null;
let dragTimer = null;
let config = null;

// ───────────── installed apps ─────────────
function listApps() {
  const dirs = ['/Applications', '/Applications/Utilities', '/System/Applications', path.join(os.homedir(), 'Applications')];
  const names = new Set();
  for (const d of dirs) {
    try {
      for (const f of fs.readdirSync(d)) if (f.endsWith('.app')) names.add(f.slice(0, -4));
    } catch {}
  }
  return [...names].sort((a, b) => a.localeCompare(b));
}
const isUrl = s => /^https?:\/\//i.test(s);
function findApp(name, apps) {
  return apps.find(a => a.toLowerCase() === name.toLowerCase())
      || apps.find(a => a.toLowerCase().startsWith(name.toLowerCase() + ' '));
}

// ───────────── config ─────────────
const userFile = name => path.join(app.getPath('userData'), name);

function defaultConfig() {
  const apps = listApps();
  return {
    scale: 3,
    house: 'nightclub',
    pets: DEFAULT_PETS.map(p => ({ name: p.name, target: findApp(p.app, apps) || p.url, skin: p.skin })),
  };
}

function sanitize(c) {
  const out = { scale: 3, house: 'nightclub', pets: [] };
  const s = Math.round(Number(c && c.scale) * 10) / 10;
  out.scale = Number.isFinite(s) ? Math.min(MAX_SCALE, Math.max(MIN_SCALE, s)) : 3;
  out.house = String((c && c.house) || 'nightclub').replace(/[^a-z0-9_-]/gi, '').slice(0, 40) || 'nightclub';
  const pets = Array.isArray(c && c.pets) ? c.pets.slice(0, MAX_PETS) : [];
  out.pets = pets.map(p => ({
    name: String((p && p.name) || '').toUpperCase().replace(/[^A-Z0-9 !?.\-+]/g, '').slice(0, 10),
    target: String((p && p.target) || '').trim().slice(0, 300),
    skin: String((p && p.skin) || 'cloudy').replace(/[^a-z0-9_-]/gi, '').slice(0, 40),
  }));
  return out;
}

function loadConfig() {
  try { return sanitize(JSON.parse(fs.readFileSync(userFile('config.json'), 'utf8'))); }
  catch { return defaultConfig(); }
}
function saveConfig() {
  try { fs.writeFileSync(userFile('config.json'), JSON.stringify(config, null, 2)); } catch {}
}

function configPayload() {
  const d = win ? screen.getDisplayMatching(win.getBounds()) : screen.getPrimaryDisplay();
  return { config, screenH: d.workArea.height, limits: { MAX_PETS, MIN_SCALE, MAX_SCALE, fitScale } };
}
function broadcastConfig() {
  for (const w of [win, settingsWin]) if (w && !w.isDestroyed()) w.webContents.send('config', configPayload());
}

// ───────────── window position (anchored at bottom-centre so resizes grow upward) ─────────────
function loadAnchor() {
  try {
    const a = JSON.parse(fs.readFileSync(userFile('position.json'), 'utf8'));
    if (screen.getAllDisplays().some(d => {
      const b = d.bounds;
      return a.cx >= b.x && a.cx <= b.x + b.width && a.bottom >= b.y && a.bottom <= b.y + b.height + 50;
    })) return a;
  } catch {}
  return defaultAnchor();
}
function defaultAnchor() {
  const wa = screen.getPrimaryDisplay().workArea;
  return { cx: wa.x + wa.width - 240, bottom: wa.y + wa.height };
}
function currentAnchor() {
  const b = win.getBounds();
  return { cx: b.x + b.width / 2, bottom: b.y + b.height };
}
function saveAnchor() {
  if (!win) return;
  try { fs.writeFileSync(userFile('position.json'), JSON.stringify(currentAnchor())); } catch {}
}
function placeAt(anchor, w, h) {
  win.setBounds({ x: Math.round(anchor.cx - w / 2), y: Math.round(anchor.bottom - h), width: Math.round(w), height: Math.round(h) });
}

// ───────────── windows ─────────────
function createWindow() {
  const a = loadAnchor();
  win = new BrowserWindow({
    width: 408, height: 600,
    x: Math.round(a.cx - 204), y: Math.round(a.bottom - 600),
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    acceptFirstMouse: true,
    backgroundColor: '#00000000',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile('index.html');
  win.on('closed', () => { win = null; });
}

function openSettings() {
  if (settingsWin) { settingsWin.show(); settingsWin.focus(); return; }
  settingsWin = new BrowserWindow({
    width: 860, height: 760, minWidth: 640, minHeight: 500,
    title: 'Customize — The Latent Space',
    backgroundColor: '#0d0a18',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  settingsWin.setMenuBarVisibility(false);
  settingsWin.loadFile('settings.html');
  if (app.dock) app.dock.show();
  app.focus({ steal: true });
  settingsWin.on('closed', () => { settingsWin = null; if (app.dock) app.dock.hide(); });
}

function buildMenu() {
  return Menu.buildFromTemplate([
    { label: 'Show / Hide Pets', click: () => win && win.webContents.send('toggle') },
    { label: 'Customize…', click: openSettings },
    { label: 'Reset Position', click: () => { const b = win.getBounds(); placeAt(defaultAnchor(), b.width, b.height); saveAnchor(); } },
    { type: 'separator' },
    { label: 'Quit The Latent Space', click: () => app.quit() },
  ]);
}

// ───────────── IPC ─────────────
ipcMain.handle('get-config', () => configPayload());
ipcMain.handle('list-apps', () => listApps());
ipcMain.on('save-config', (_e, c) => {
  config = sanitize(c);
  broadcastConfig();
  clearTimeout(configWriteTimer);
  configWriteTimer = setTimeout(saveConfig, 300);
});
ipcMain.on('reset-config', () => { config = defaultConfig(); saveConfig(); broadcastConfig(); });
ipcMain.on('open-settings', openSettings);

let configWriteTimer = null;
ipcMain.on('report-fit', (e, f) => {
  if (!win || e.sender !== win.webContents) return;
  f = Math.max(MIN_SCALE, Math.min(MAX_SCALE, Number(f) || MAX_SCALE));
  if (f === fitScale) return;
  fitScale = f;
  if (settingsWin && !settingsWin.isDestroyed()) settingsWin.webContents.send('fit', fitScale);
});

ipcMain.on('set-ignore', (e, ignore) => {
  if (win && e.sender === win.webContents) win.setIgnoreMouseEvents(!!ignore, { forward: true });
});

ipcMain.on('resize', (e, w, h) => {
  if (!win || e.sender !== win.webContents) return;
  w = Math.max(50, Math.min(4000, Number(w) || 0));
  h = Math.max(50, Math.min(4000, Number(h) || 0));
  const b = win.getBounds();
  if (b.width === w && b.height === h) return;
  placeAt(currentAnchor(), w, h);
});

ipcMain.on('launch', (_e, i) => {
  const pet = config.pets[i];
  if (!pet || !pet.target) return;
  if (isUrl(pet.target)) { shell.openExternal(pet.target); return; }
  execFile('open', ['-a', pet.target], err => { if (err) console.error(`Could not open ${pet.target}:`, err.message); });
});

ipcMain.on('drag-start', () => {
  if (!win) return;
  const c = screen.getCursorScreenPoint();
  const [wx, wy] = win.getPosition();
  const off = { x: c.x - wx, y: c.y - wy };
  clearInterval(dragTimer);
  dragTimer = setInterval(() => {
    const p = screen.getCursorScreenPoint();
    win.setPosition(p.x - off.x, p.y - off.y);
  }, 8);
});
ipcMain.on('drag-end', () => { clearInterval(dragTimer); dragTimer = null; saveAnchor(); });

ipcMain.on('menu', e => { if (win && e.sender === win.webContents) buildMenu().popup({ window: win }); });

// ───────────── lifecycle ─────────────
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', openSettings);
  app.whenReady().then(() => {
    if (app.dock) app.dock.hide();
    config = loadConfig();
    createWindow();
    tray = new Tray(nativeImage.createEmpty());
    tray.setTitle('🪩');
    tray.setToolTip('The Latent Space');
    tray.setContextMenu(buildMenu());
  });
  app.on('window-all-closed', () => app.quit());
}
