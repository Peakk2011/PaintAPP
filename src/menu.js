const { app } = require('electron');

const createMacMenu = (createWindow, windowSize) => {
  return [
    {
      label: app.name,
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'File',
      submenu: [
        {
          label: 'Export Image',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.send('trigger-action', 'export-image');
            }
          }
        },
        {
          label: 'Clear',
          accelerator: 'CmdOrCtrl+C',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.send('trigger-action', 'clear');
            }
          }
        }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Undo',
          accelerator: 'CmdOrCtrl+Z',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.send('trigger-action', 'undo');
            }
          }
        },
        {
          label: 'Redo',
          accelerator: 'Shift+CmdOrCtrl+Z',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.send('trigger-action', 'redo');
            }
          }
        }
      ]
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Zoom In',
          accelerator: 'CmdOrCtrl+=',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.send('trigger-action', 'zoom-in');
            }
          }
        },
        {
          label: 'Zoom Out',
          accelerator: 'CmdOrCtrl+-',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.send('trigger-action', 'zoom-out');
            }
          }
        },
        {
          label: 'Reset Zoom',
          accelerator: 'CmdOrCtrl+0',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.webContents.send('trigger-action', 'zoom-reset');
            }
          }
        },
        { type: 'separator' },
        { role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Window',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            createWindow();
          }
        },          
        { type: 'separator' },
        {
          label: 'Reset Window Size',
          click: (item, focusedWindow) => {
            if (focusedWindow) {
              focusedWindow.setSize(windowSize.width, windowSize.height, true);
            }
          }
        },
        { role: 'close' },
        { type: 'separator' },
        { role: 'minimize' },
        { role: 'zoom' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        { type: 'separator' },
        { role: 'front' }
      ]
    }
  ];
};

const createContextMenu = (currentBrush) => {
  return [
    { label: 'Undo', accelerator: 'CmdOrCtrl+Z', click: () => event.sender.send('trigger-action', 'undo') },
    { label: 'Redo', accelerator: 'Shift+CmdOrCtrl+Z', click: () => event.sender.send('trigger-action', 'redo') },
    { type: 'separator' },
    { label: 'Save Project', accelerator: 'CmdOrCtrl+S', click: () => event.sender.send('trigger-action', 'save-project') },
    { label: 'Export Image', accelerator: 'CmdOrCtrl+Shift+S', click: () => event.sender.send('trigger-action', 'export-image') },
    { label: 'Clear Canvas', click: () => event.sender.send('trigger-action', 'clear') },
    { type: 'separator' },
    {
      label: 'Brush Style',
      submenu: [
        { label: 'Smooth', type: 'radio', checked: currentBrush === 'smooth', click: () => event.sender.send('trigger-action', 'set-brush', 'smooth') },
        { label: 'Pen Style', type: 'radio', checked: currentBrush === 'texture', click: () => event.sender.send('trigger-action', 'set-brush', 'texture') }
      ]
    }
  ];
};

module.exports = { createMacMenu, createContextMenu };