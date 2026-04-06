const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onSessionCount: (cb) => ipcRenderer.on('session-count', (_e, count) => cb(count)),
  onMouseMove: (cb) => ipcRenderer.on('mouse-move', (_e, point) => cb(point)),
  onWindowOffset: (cb) => ipcRenderer.on('window-offset', (_e, offset) => cb(offset)),
  onUpdateSvg: (cb) => ipcRenderer.on('update-svg', (_e, svg) => cb(svg)),
  setIgnoreMouse: (ignore) => ipcRenderer.send('set-ignore-mouse', ignore),
});
