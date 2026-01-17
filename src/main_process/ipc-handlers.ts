/**
 * @file IPC communication handlers.
 * @author Peakk2011 <peakk3984@gmail.com>
 */

import { ipcMain, BrowserWindow, Menu, dialog, IpcMainEvent } from 'electron';
import fs from 'node:fs';
import { createContextMenu } from './menu.js';
import { logger } from './logger.js';

/**
 * Payload for save-image IPC event
 */
interface SaveImagePayload {
    dataUrl: string;
    format: string;
}

/**
 * Set up all IPC communication handlers
 */
export const setupIpcHandlers = (): void => {
    logger.info('Setting up IPC handlers');

    // Context menu handler
    ipcMain.on('show-context-menu', handleShowContextMenu);

    // Save image handler
    ipcMain.on('save-image', handleSaveImage);

    logger.info('IPC handlers set up');
};

/**
 * Handle save-image IPC event.
 * Shows a save dialog and writes the image data to the selected file.
 * @param event - IPC event
 * @param payload - Data payload
 */
const handleSaveImage = async (event: IpcMainEvent, payload: SaveImagePayload): Promise<void> => {
    const window = BrowserWindow.fromWebContents(event.sender);
    if (!window || window.isDestroyed()) {
        logger.warn(
            'Cannot show save dialog: window not found or destroyed'
        );

        return;
    }

    try {
        const { filePath, canceled } = await dialog.showSaveDialog(window, {
            title: 'Save Image',
            defaultPath: `drawing-${Date.now()}.${payload.format}`,

            filters: [
                { name: 'Images', extensions: [payload.format] },
                { name: 'All Files', extensions: ['*'] }
            ]
        });

        if (canceled || !filePath) {
            logger.info('Save image dialog was canceled.');
            return;
        }

        // The data URL is base64 encoded, so we need to decode it to a buffer
        const base64Data = payload.dataUrl.replace(/^data:image\/\w+;base64,/, '');
        const dataBuffer = Buffer.from(base64Data, 'base64');

        await fs.promises.writeFile(
            filePath,
            dataBuffer
        );
        
        logger.info(`Image saved successfully to ${filePath}`);

    } catch (error) {
        logger.error('Failed to save image:', error);
        
        dialog.showErrorBox(
            'Save Error',
            `Failed to save the image:\n${error instanceof Error ? error.message : String(error)}`
        );
    }
};

/**
 * Handle show-context-menu IPC event
 * @param event - IPC event
 * @param currentBrush - Current brush style
 */
const handleShowContextMenu = (event: IpcMainEvent, currentBrush: string): void => {
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

