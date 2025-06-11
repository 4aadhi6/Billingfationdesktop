const { contextBridge, ipcRenderer } = require('electron');

// Expose a safe, limited API to the renderer process (your React app)
contextBridge.exposeInMainWorld('electronAPI', {
  saveBarcode: (data) => ipcRenderer.invoke('dialog:save-barcode', data),
});
