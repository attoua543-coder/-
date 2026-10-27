const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  checkFfmpeg: () => ipcRenderer.invoke('check-ffmpeg'),
  startStream: (options) => ipcRenderer.invoke('start-stream', options),
  stopStream: () => ipcRenderer.invoke('stop-stream'),
  onStreamState: (callback) => ipcRenderer.on('stream-state', (_event, status) => callback(status)),
  onFfmpegLog: (callback) => ipcRenderer.on('ffmpeg-log', (_event, data) => callback(data)),
  onStreamError: (callback) => ipcRenderer.on('stream-error', (_event, message) => callback(message))
});
