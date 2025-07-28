const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showSaveDialog: (args) => ipcRenderer.invoke('show-save-dialog', args),
  showDirectoryPicker: () => ipcRenderer.invoke('show-directory-picker'),
  closeApp: () => ipcRenderer.invoke('close-app'),
  // Add other IPC channels here if needed in the future
});
