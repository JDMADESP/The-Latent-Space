const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('latent', {
  // config
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: cfg => ipcRenderer.send('save-config', cfg),
  resetConfig: () => ipcRenderer.send('reset-config'),
  listApps: () => ipcRenderer.invoke('list-apps'),
  onConfig: fn => ipcRenderer.on('config', (_e, data) => fn(data)),
  openSettings: () => ipcRenderer.send('open-settings'),
  // pet window
  setIgnore: ignore => ipcRenderer.send('set-ignore', ignore),
  layout: info => ipcRenderer.send('layout', info),
  onFlip: fn => ipcRenderer.on('flip', (_e, f) => fn(f)),
  reportFit: f => ipcRenderer.send('report-fit', f),
  onFit: fn => ipcRenderer.on('fit', (_e, f) => fn(f)),
  launch: index => ipcRenderer.send('launch', index),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragEnd: () => ipcRenderer.send('drag-end'),
  menu: () => ipcRenderer.send('menu'),
  onToggle: fn => ipcRenderer.on('toggle', fn),
});
