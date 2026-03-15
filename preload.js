const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Cleaning operations
  cleanTemp: () => ipcRenderer.invoke('clean-temp'),
  cleanBrowserCache: () => ipcRenderer.invoke('clean-browser-cache'),
  cleanRecycleBin: () => ipcRenderer.invoke('clean-recycle-bin'),
  cleanSystemLogs: () => ipcRenderer.invoke('clean-system-logs'),
  
  // System info
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  
  // Combined operations
  quickScan: () => ipcRenderer.invoke('quick-scan'),
  fullClean: () => ipcRenderer.invoke('full-clean'),
  
  // Platform info
  platform: process.platform
});
