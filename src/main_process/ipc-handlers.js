/**
 * @file IPC communication handlers.
 * @author Peakk2011 <peakk3984@gmail.com>
 */

import { ipcMain, BrowserWindow, Menu } from 'electron';
import { createContextMenu } from './menu.js';
import { logger } from './logger.js';

/**
 * Set up all IPC communication handlers
 */
export const setupIpcHandlers = () => {
    logger.info('Setting up IPC handlers');
    
    // Context menu handler
    ipcMain.on('show-context-menu', handleShowContextMenu);
    
    // Add more IPC handlers here as needed
    
    logger.info('IPC handlers set up');
};

/**
 * Handle show-context-menu IPC event
 * @param {Electron.IpcMainEvent} event - IPC event
 * @param {string} currentBrush - Current brush style
 */
const handleShowContextMenu = (event, currentBrush) => {
    logger.debug('Context menu requested', { currentBrush });
    
    const template = createContextMenu(currentBrush);
    const menu = Menu.buildFromTemplate(template);
    const window = BrowserWindow.fromWebContents(event.sender);
    
    if (window && !window.isDestroyed()) {
        menu.popup({ window });
        logger.debug('Context menu shown');
    } else {
        logger.warn('Cannot show context menu: window not found or destroyed');
    }
};