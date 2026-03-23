const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('api', {
  getMemos: () => ipcRenderer.invoke('get-memos'),
  saveMemos: (memos) => ipcRenderer.invoke('save-memos', memos),
  getConfig: () => ipcRenderer.invoke('get-config'),
  saveConfig: (config) => ipcRenderer.invoke('save-config', config),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  onOpacityChanged: (callback) => {
    ipcRenderer.on('opacity-changed', (event, opacity) => callback(opacity))
  },
  getTrash: () => ipcRenderer.invoke('get-trash'),
  saveTrash: (trash) => ipcRenderer.invoke('save-trash', trash),
  showWindow: () => ipcRenderer.invoke('show-window'),
  toggleWindow: () => ipcRenderer.invoke('toggle-window'),
  
  syncInit: () => ipcRenderer.invoke('sync-init'),
  syncSetCredentials: (url, anonKey) => ipcRenderer.invoke('sync-set-credentials', url, anonKey),
  syncSignIn: (email, password) => ipcRenderer.invoke('sync-sign-in', email, password),
  syncSignUp: (email, password) => ipcRenderer.invoke('sync-sign-up', email, password),
  syncSignOut: () => ipcRenderer.invoke('sync-sign-out'),
  syncGetSession: () => ipcRenderer.invoke('sync-get-session'),
  syncUploadAll: () => ipcRenderer.invoke('sync-upload-all'),
  syncDownloadAll: () => ipcRenderer.invoke('sync-download-all'),
  syncUploadMemos: () => ipcRenderer.invoke('sync-upload-memos'),
  syncDownloadMemos: () => ipcRenderer.invoke('sync-download-memos'),
  syncUploadConfig: () => ipcRenderer.invoke('sync-upload-config'),
  syncDownloadConfig: () => ipcRenderer.invoke('sync-download-config'),
  syncUploadTrash: () => ipcRenderer.invoke('sync-upload-trash'),
  syncDownloadTrash: () => ipcRenderer.invoke('sync-download-trash')
})
