/**
 * @file Window management module.
 * @author Peakk2011 <peakk3984@gmail.com>
 */

import { BrowserWindow, Menu, app } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';
import { windowConfig, platform, getIconPath } from './config.js';
import { getSavedWindowBounds, saveWindowBounds } from './store.js';
import { createMacMenu } from './menu.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Main application window instance
 * @type {BrowserWindow|null}
 */
let mainWindow = null;

/**
 * WebPreferences configuration for the window
 */
const webPreferences = {
    preload: path.join(__dirname, '..', 'preload.js'),
    contextIsolation: true,
    nodeIntegration: false,
    sandbox: false,
    backgroundThrottling: false,
    
    // Security settings
    webSecurity: true,
    allowRunningInsecureContent: false,
    experimentalFeatures: false,
    
    // Performance settings
    v8CacheOptions: 'code',
    offscreen: false,
    
    // Disable unnecessary features
    plugins: false,
    java: false,
    enableWebSQL: false,
    spellcheck: false
};

/**
 * Create the main application window
 * @returns {Promise<BrowserWindow>} Created window instance
 */
export const createMainWindow = async () => {
    logger.info('Creating main application window');
    
    const startTime = Date.now();
    const savedBounds = getSavedWindowBounds();
    
    // Merge saved bounds with default/minimum sizes
    const windowBounds = {
        ...savedBounds,
        minWidth: windowConfig.min.width,
        minHeight: windowConfig.min.height,
        width: Math.max(savedBounds.width, windowConfig.min.width),
        height: Math.max(savedBounds.height, windowConfig.min.height)
    };
    
    // Create window with platform-specific options
    mainWindow = new BrowserWindow({
        ...windowBounds,
        show: true,
        backgroundColor: '#ffffff',
        ...platform.getWindowOptions(),
        icon: getIconPath(),
        title: 'PaintAPP',
        webPreferences
    });
    
    const creationTime = Date.now() - startTime;
    logger.info('Main window created', {
        durationMs: creationTime,
        bounds: windowBounds
    });
    
    // Set up window event handlers
    setupWindowEventHandlers(mainWindow);
    
    // Set up application menu
    setupApplicationMenu();
    
    // Load the HTML file
    const indexPath = path.join(__dirname, '..', 'index.html');
    await mainWindow.loadFile(indexPath);
    
    logger.info('Main window loaded', {
        file: indexPath,
        totalLoadTime: Date.now() - startTime
    });
    
    return mainWindow;
};

/**
 * Set up window event handlers
 * @param {BrowserWindow} window - Window instance
 */
const setupWindowEventHandlers = (window) => {
    // Save window bounds on resize/move
    saveWindowBounds(window);
    
    // DOM ready event
    window.webContents.on('dom-ready', () => {
        logger.info('Renderer DOM ready', {
            webContentsId: window.webContents.id
        });
        
        // Open DevTools in development mode
        if (process.env.NODE_ENV === 'development' || !app.isPackaged) {
            window.webContents.openDevTools({ mode: 'detach' });
        }
    });
    
    // Window closed event
    window.on('closed', () => {
        logger.info('Main window closed');
        mainWindow = null;
    });
    
    // Focus event
    window.on('focus', () => {
        logger.debug('Window focused');
    });
};

/**
 * Set up application menu
 */
const setupApplicationMenu = () => {
    if (platform.isMac()) {
        const menuTemplate = createMacMenu(createMainWindow, windowConfig);
        const menu = Menu.buildFromTemplate(menuTemplate);
        Menu.setApplicationMenu(menu);
        logger.info('macOS application menu set');
    } else if (platform.isWindows()) {
        // Windows: No menu bar
        app.setAppUserModelId('com.mintteams.paintapp');
        Menu.setApplicationMenu(null);
        logger.info('Windows application menu hidden');
    }
};

/**
 * Get the main window instance
 * @returns {BrowserWindow|null} Main window instance
 */
export const getMainWindow = () => mainWindow;

/**
 * Close the main window
 */
export const closeMainWindow = () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
    }
};

/**
 * Check if main window exists
 * @returns {boolean} True if window exists
 */
export const hasMainWindow = () => mainWindow !== null;