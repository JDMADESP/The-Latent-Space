const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('latent', {
  setIgnore: ignore => ipcRenderer.send('set-ignore', ignore),
  launch: id => ipcRenderer.send('launch', id),
  dragStart: () => ipcRenderer.send('drag-start'),
  dragEnd: () => ipcRenderer.send('drag-end'),
  menu: () => ipcRenderer.send('menu'),
  onToggle: fn => ipcRenderer.on('toggle', fn),
});
