const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('api', {
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings:  (s) => ipcRenderer.invoke('settings:save', s),
  start:         () => ipcRenderer.invoke('timer:start'),
  pause:         () => ipcRenderer.invoke('timer:pause'),
  status:        () => ipcRenderer.invoke('timer:status'),
  breakDone:     () => ipcRenderer.send('break:done')
});
