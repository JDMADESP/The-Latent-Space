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
  resize: (w, h) => ipcRenderer.send('resize', w, h),
  reportFit: f => ipcRenderer.send('report-fit', f),
  onFit: fn => ipcRenderer.on('fit', (_e, f) => fn(f)),
  launch: index => ipcRenderer.send('launch', index),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragEnd: () => ipcRenderer.send('drag-end'),
  menu: () => ipcRenderer.send('menu'),
  onToggle: fn => ipcRenderer.on('toggle', fn),
});
