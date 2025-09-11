const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const path = require('node:path');
const { createMacMenu, createContextMenu } = require('./menu');

if (require('electron-squirrel-startup')) {
  app.quit();
}

app.commandLine.appendSwitch('--disable-background-timer-throttling');
app.commandLine.appendSwitch('--disable-renderer-backgrounding');

const windowSize = {
  width: 1024,
  height: 860,
  min: {
    width: 380,
    height: 440,
  },
};

let mainWindow;
let splashWindow;

const createWindow = async () => {
  const Store = (await import('electron-store')).default;
  const store = new Store({
    defaults: {
      windowBounds: { width: windowSize.width, height: windowSize.height }
    }
  });

  const isMac = process.platform === 'darwin';

  // Platform-specific window options
  let platformSpecificOptions = {};
  if (process.platform === 'win32') {
    platformSpecificOptions = {
      titleBarStyle: 'default',
      frame: true,
    };
  } else if (isMac) {
    platformSpecificOptions = { titleBarStyle: 'hiddenInset', vibrancy: 'under-window', frame: true };
  }

  const { x, y, width, height } = store.get('windowBounds');

  mainWindow = new BrowserWindow({
    x,
    y,
    width,
    height,
    minWidth: windowSize.min.width,
    minHeight: windowSize.min.height,
    show: false, 
    ...platformSpecificOptions,
    icon: path.join(__dirname, 'assets', 'icon', isMac ? 'paintAPP.icns' : 'paintAPP.ico'),
    title: 'PaintAPP',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
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
  });

  mainWindow.once('ready-to-show', () => {
    if (splashWindow) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
      mainWindow.webContents.openDevTools();
    }
  });

  const saveBounds = () => {
    store.set('windowBounds', mainWindow.getBounds());
  };
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move', saveBounds);

  // Hide the menu bar on Windows
  if (process.platform === 'win32') {
    mainWindow.setMenu(null);
  }

  mainWindow.loadFile(path.join(__dirname, 'index.html'));

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  return mainWindow;
};

const createSplashWindow = () => {
  splashWindow = new BrowserWindow({
    width: 300,
    height: 400,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    movable: false,
  });
  splashWindow.loadFile(path.join(__dirname, 'splash.html'));
};

app.whenReady().then(async () => {
  createSplashWindow();

  if (process.platform === 'darwin') {
    const menuTemplate = createMacMenu(createWindow, windowSize);
    const menu = Menu.buildFromTemplate(menuTemplate);
    Menu.setApplicationMenu(menu);
  }

  if (process.platform === 'win32') {
    app.setAppUserModelId('com.mintteams.paintapp');
  }

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
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
ipcMain.on('show-context-menu', (event, currentBrush) => {
  const template = createContextMenu(currentBrush);
  const menu = Menu.buildFromTemplate(template);
  const win = BrowserWindow.fromWebContents(event.sender);
  if (win) {
    menu.popup({ window: win });
  }
});