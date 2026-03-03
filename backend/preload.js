const { contextBridge, ipcRenderer, shell } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showSaveDialog: (args) => ipcRenderer.invoke('show-save-dialog', args),
  showDirectoryPicker: () => ipcRenderer.invoke('show-directory-picker'),
  closeApp: () => ipcRenderer.invoke('close-app'),
  openExternal: (url) => ipcRenderer.invoke('open-external', url),
  // Add other IPC channels here if needed in the future
});
