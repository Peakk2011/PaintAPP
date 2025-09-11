const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('node:path');

if (require('electron-squirrel-startup')) {
  app.quit();
}

app.commandLine.appendSwitch('--enable-features', 'VaapiVideoDecoder');
app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');
app.commandLine.appendSwitch('--disable-backgrounding-occluded-windows');
app.commandLine.appendSwitch('--disable-features', 'TranslateUI');
app.commandLine.appendSwitch('--disable-ipc-flooding-protection');
app.commandLine.appendSwitch('--enable-zero-copy');

app.commandLine.appendSwitch('--disable-extensions');
app.commandLine.appendSwitch('--disable-plugins');
app.commandLine.appendSwitch('--disable-component-extensions-with-background-pages');

const windowSize = {
  width: 1024,
  height: 860,
  min: {
    width: 380,
    height: 440,
  },
};

const createWindow = async () => {
  const Store = (await import('electron-store')).default;
  const store = new Store({
    defaults: {
      windowBounds: { width: windowSize.width, height: windowSize.height }
    }
  });

  const isWindows = process.platform === 'win32';
  const isMac = process.platform === 'darwin';

  let titleBarStyle = 'default';
  let titleBarOverlay = false;

  if (isWindows) {
    titleBarStyle = 'hidden';
    titleBarOverlay = {
      color: '#141414',
      symbolColor: '#ffffff',
      height: 35,
    };
  } else if (isMac) {
    titleBarStyle = 'hiddenInset';
  }

  const { x, y, width, height } = store.get('windowBounds');

  const mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: windowSize.min.width,
    minHeight: windowSize.min.height,
    show: false, 
    titleBarStyle: titleBarStyle,
    titleBarOverlay: titleBarOverlay,
    title: 'PaintAPP',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true, 

      backgroundThrottling: false,
      offscreen: false,

      experimentalFeatures: false,
      v8CacheOptions: 'code',

      webSecurity: true,
      allowRunningInsecureContent: false,
      plugins: false,
      java: false,
    },

    transparent: false, 
    frame: !isWindows, 
    vibrancy: isMac ? 'under-window' : undefined, 
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();

    if (process.platform === 'darwin') {
      mainWindow.focus();
    }
  });

  const saveBounds = () => {
    store.set('windowBounds', mainWindow.getBounds());
  };
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  mainWindow.loadFile(path.join(__dirname, 'index.html'));
  mainWindow.webContents.openDevTools();

  mainWindow.on('closed', () => {
    if (process.platform !== 'darwin') {
      global.gc && global.gc(); 
    }
  });

  mainWindow.webContents.on('dom-ready', () => {
    mainWindow.webContents.session.clearCache();
  });

  return mainWindow;
};

app.whenReady().then(async () => {
  if (process.platform === 'darwin') {
    const menuTemplate = [
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
                focusedWindow.webContents.send('trigger-action', 'export-image');
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
            click: async () => {
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
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
  }

  if (process.platform === 'win32') {
    app.setAppUserModelId('com.mintteams.paintapp');
  }

  await createWindow();

  app.on('activate', async () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      await createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Memory management
app.on('window-all-closed', () => {
  if (global.gc) {
    global.gc();
  }
});

app.on('certificate-error', (event, webContents, url, error, certificate, callback) => {
  if (process.env.NODE_ENV === 'development') {
    event.preventDefault();
    callback(true);
  } else {
    callback(false);
  }
});

// Fallback if app run not smoothly 
// app.disableHardwareAcceleration();

// Context Menu
ipcMain.on('show-context-menu', (event) => {
  const template = [
    {
      label: 'Undo',
      accelerator: 'CmdOrCtrl+Z',
      click: () => event.sender.send('trigger-action', 'undo')
    },
    {
      label: 'Redo',
      accelerator: 'Shift+CmdOrCtrl+Z',
      click: () => event.sender.send('trigger-action', 'redo')
    },
    { type: 'separator' },
    {
      label: 'Save Project',
      accelerator: 'CmdOrCtrl+S',
      click: () => event.sender.send('trigger-action', 'save-project')
    },
    {
      label: 'Export Image',
      accelerator: 'CmdOrCtrl+Shift+S',
      click: () => event.sender.send('trigger-action', 'export-image')
    },
    {
      label: 'Clear Canvas',
      click: () => event.sender.send('trigger-action', 'clear')
    },
    { type: 'separator' },
    {
      label: 'Brush Style',
      submenu: [
        { label: 'Smooth', type: 'radio', click: () => event.sender.send('trigger-action', 'set-brush', 'smooth') },
        { label: 'Pen Style', type: 'radio', click: () => event.sender.send('trigger-action', 'set-brush', 'texture') }
      ]
    }
  ];
  const menu = Menu.buildFromTemplate(template);
  const win = BrowserWindow.fromWebContents(event.sender);
  menu.popup(win);
});