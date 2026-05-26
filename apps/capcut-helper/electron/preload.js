const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('helper', {
  getState: () => ipcRenderer.invoke('helper:getState'),
  openWebApp: () => ipcRenderer.invoke('helper:openWebApp'),
  openCapcutFolder: () => ipcRenderer.invoke('helper:openCapcutFolder'),
  unpair: () => ipcRenderer.invoke('helper:unpair'),
  onState: (cb) => {
    const listener = (_e, state) => cb(state);
    ipcRenderer.on('helper:state', listener);
    return () => ipcRenderer.removeListener('helper:state', listener);
  },
});
