const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  safeLoadURL: (url) => ipcRenderer.invoke('safe-load-url', url),
  getSecureConfig: () => ipcRenderer.invoke('get-secure-config'),
});


 
 
 
 
 
 
}