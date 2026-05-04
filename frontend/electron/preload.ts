const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  getEnv: (key) => ipcRenderer.invoke('get-env', key),

  // 👇 Nuevos métodos para Deepgram
  deepgramConnect: (token, language) => ipcRenderer.invoke('deepgram-connect', { token, language }),
  deepgramSend: (audioChunk) => ipcRenderer.invoke('deepgram-send', audioChunk),
  deepgramDisconnect: () => ipcRenderer.invoke('deepgram-disconnect'),

  deepgramKeepalive: () => ipcRenderer.invoke('deepgram-keepalive'),


  // 👇 Escuchar eventos del main process
  onDeepgramMessage: (callback) => ipcRenderer.on('deepgram-message', (_, data) => callback(data)),
  onDeepgramStatus: (callback) => ipcRenderer.on('deepgram-status', (_, data) => callback(data)),


  downloadUpdate: () => ipcRenderer.invoke('download-update'),
  installUpdate: () => ipcRenderer.invoke('install-update'),


  onUpdateAvailable: (callback) => ipcRenderer.on("update-available", callback),
  onUpdateProgress: (callback) => ipcRenderer.on('update-progress', (event, data) => callback(data)),
  onUpdateReady: (callback) => ipcRenderer.on('update-ready', callback),

  // 👇 Limpiar listeners para evitar memory leaks
  removeDeepgramListeners: () => {
    ipcRenderer.removeAllListeners('deepgram-message');
    ipcRenderer.removeAllListeners('deepgram-status');
  }
});

