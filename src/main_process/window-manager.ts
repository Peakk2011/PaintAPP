/**
 * @file Window management module.
 * @author Peakk2011 <peakk3984@gmail.com>
 */

import { BrowserWindow, Menu, app, WebPreferences, nativeTheme } from 'electron';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { logger } from './logger.js';
import { windowConfig, platform, getIconPath } from './config.js';
import { getSavedWindowBounds, saveWindowBounds } from './store.js';
import { createMacMenu } from './menu.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Get the source directory path
 * Development: points to src/
 * Production: points to the app's resources directory
 */
const getSourcePath = (): string => {
    if (app.isPackaged) {
        return path.join(process.resourcesPath, 'app', 'src');
    } else {
        return path.join(__dirname, '..', '..', 'src');
    }
};

/**
 * Main application window instance
 */
let mainWindow: BrowserWindow | null = null;

/**
 * WebPreferences configuration for the window
 */
const webPreferences: WebPreferences = {
    preload: path.join(getSourcePath(), 'preload.js'),
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
    
    // Unnecessary features
    plugins: false,
    enableWebSQL: false,
    spellcheck: false
};

/**
 * Create the main application window
 * @returns Created window instance
 */
export const createMainWindow = async (): Promise<BrowserWindow> => {
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
        backgroundColor: nativeTheme.shouldUseDarkColors ? '#ffffff' : '#000000',
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
    const indexPath = path.join(getSourcePath(), 'index.html');
    await mainWindow.loadFile(indexPath);
    
    logger.info('Main window loaded', {
        file: indexPath,
        totalLoadTime: Date.now() - startTime
    });
    
    return mainWindow;
};

/**
 * Set up window event handlers
 * @param window - Window instance
 */
const setupWindowEventHandlers = (window: BrowserWindow): void => {
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
const setupApplicationMenu = (): void => {
    if (platform.isMac()) {
        const defaultWindowSize = { width: windowConfig.default.width, height: windowConfig.default.height };
        const menuTemplate = createMacMenu(createMainWindow, defaultWindowSize);
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
 * @returns Main window instance
 */
export const getMainWindow = (): BrowserWindow | null => mainWindow;

/**
 * Close the main window
 */
export const closeMainWindow = (): void => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.close();
    }
};

/**
 * Check if main window exists
 * @returns True if window exists
 */
export const hasMainWindow = (): boolean => mainWindow !== null;

