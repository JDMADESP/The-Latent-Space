// The Latent Space — a pixel house full of AI desktop pets.
const { app, BrowserWindow, ipcMain, screen, Menu, Tray, nativeImage } = require('electron');
const { execFile } = require('child_process');
const path = require('path');
const fs = require('fs');

// Which macOS app each pet opens (names as they appear in /Applications).
const APPS = {
  chatgpt: 'ChatGPT',
  claude: 'Claude',
  muse: 'Muse',
  grok: 'Grok Bot',
};

const WIN_W = 576;
const WIN_H = 360;

let win = null;
let tray = null;
let dragTimer = null;

const posFile = () => path.join(app.getPath('userData'), 'position.json');

function loadPosition() {
  try {
    const p = JSON.parse(fs.readFileSync(posFile(), 'utf8'));
    const onScreen = screen.getAllDisplays().some(d => {
      const b = d.workArea;
      return p.x >= b.x - WIN_W / 2 && p.x <= b.x + b.width - WIN_W / 2 &&
             p.y >= b.y - WIN_H / 2 && p.y <= b.y + b.height - WIN_H / 2;
    });
    if (onScreen) return p;
  } catch {}
  return defaultPosition();
}

function defaultPosition() {
  const wa = screen.getPrimaryDisplay().workArea;
  return { x: wa.x + wa.width - WIN_W - 20, y: wa.y + wa.height - WIN_H };
}

function savePosition() {
  if (!win) return;
  const [x, y] = win.getPosition();
  try { fs.writeFileSync(posFile(), JSON.stringify({ x, y })); } catch {}
}

function createWindow() {
  const pos = loadPosition();
  win = new BrowserWindow({
    width: WIN_W,
    height: WIN_H,
    x: pos.x,
    y: pos.y,
    transparent: true,
    frame: false,
    resizable: false,
    hasShadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    acceptFirstMouse: true,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });
  win.setAlwaysOnTop(true, 'floating');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  // Clicks pass through transparent areas; the renderer turns this off over the house/pets.
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile('index.html');
}

function buildMenu() {
  return Menu.buildFromTemplate([
    { label: 'Show / Hide Pets', click: () => win && win.webContents.send('toggle') },
    { label: 'Reset Position', click: () => { const p = defaultPosition(); win.setPosition(p.x, p.y); savePosition(); } },
    { type: 'separator' },
    { label: 'Quit The Latent Space', click: () => app.quit() },
  ]);
}

ipcMain.on('set-ignore', (_e, ignore) => {
  if (win) win.setIgnoreMouseEvents(ignore, { forward: true });
});

ipcMain.on('launch', (_e, id) => {
  const name = APPS[id];
  if (!name) return;
  execFile('open', ['-a', name], err => {
    if (err) console.error(`Could not open ${name}:`, err.message);
  });
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

ipcMain.on('drag-end', () => {
  clearInterval(dragTimer);
  dragTimer = null;
  savePosition();
});

ipcMain.on('menu', () => {
  if (win) buildMenu().popup({ window: win });
});

app.whenReady().then(() => {
  if (app.dock) app.dock.hide();
  createWindow();
  tray = new Tray(nativeImage.createEmpty());
  tray.setTitle('⌂');
  tray.setToolTip('The Latent Space');
  tray.setContextMenu(buildMenu());
});

app.on('window-all-closed', () => app.quit());
