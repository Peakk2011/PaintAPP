const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
  ipcRenderer: {
    on: (channel, listener) => {
      ipcRenderer.on(channel, (event, ...args) => listener(...args));
    },
    send: (channel, ...args) => {
      ipcRenderer.send(channel, ...args);
    }
  },
});