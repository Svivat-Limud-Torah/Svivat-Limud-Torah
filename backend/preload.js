const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showSaveDialog: (args) => ipcRenderer.invoke('show-save-dialog', args),
  // Add other IPC channels here if needed in the future
});
