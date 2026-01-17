/**
 * @file Menu configuration for the main process.
 * @author Peakk2011 <peakk3984@gmail.com>
 */

import { app, MenuItemConstructorOptions, BrowserWindow } from 'electron';

/**
 * Window size configuration
 */
interface WindowSize {
    width: number;
    height: number;
}

/**
 * Creates the application menu template for macOS.
 * @param createWindow - A function to create a new application window.
 * @param windowSize - An object containing default window dimensions.
 * @returns The menu template.
 */
export const createMacMenu = (
    createWindow: () => Promise<BrowserWindow>,
    windowSize: WindowSize
): MenuItemConstructorOptions[] => {
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
                        if (focusedWindow && focusedWindow instanceof BrowserWindow) {
                            focusedWindow.webContents.send('trigger-action', 'export-image');
                        }
                    }
                },
                {
                    label: 'Clear',
                    accelerator: 'CmdOrCtrl+C',
                    click: (item, focusedWindow) => {
                        if (focusedWindow && focusedWindow instanceof BrowserWindow) {
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
                        if (focusedWindow && focusedWindow instanceof BrowserWindow) {
                            focusedWindow.webContents.send('trigger-action', 'undo');
                        }
                    }
                },
                {
                    label: 'Redo',
                    accelerator: 'Shift+CmdOrCtrl+Z',
                    click: (item, focusedWindow) => {
                        if (focusedWindow && focusedWindow instanceof BrowserWindow) {
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
                        if (focusedWindow && focusedWindow instanceof BrowserWindow) {
                            focusedWindow.webContents.send('trigger-action', 'zoom-in');
                        }
                    }
                },
                {
                    label: 'Zoom Out',
                    accelerator: 'CmdOrCtrl+-',
                    click: (item, focusedWindow) => {
                        if (focusedWindow && focusedWindow instanceof BrowserWindow) {
                            focusedWindow.webContents.send('trigger-action', 'zoom-out');
                        }
                    }
                },
                {
                    label: 'Reset Zoom',
                    accelerator: 'CmdOrCtrl+0',
                    click: (item, focusedWindow) => {
                        if (focusedWindow && focusedWindow instanceof BrowserWindow) {
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

/**
 * Creates the context menu template.
 * @param currentBrush - Current brush type ('smooth' | 'texture')
 * @returns The menu template
 */
export const createContextMenu = (currentBrush?: string): MenuItemConstructorOptions[] => {
    // Set default if currentBrush is undefined
    const brushType = currentBrush || 'smooth';

    return [
        {
            label: 'Undo',
            accelerator: 'CmdOrCtrl+Z',
            click: (item, focusedWindow) => {
                if (focusedWindow && focusedWindow instanceof BrowserWindow) {
                    focusedWindow.webContents.send('trigger-action', 'undo');
                }
            }
        },
        {
            label: 'Redo',
            accelerator: 'Shift+CmdOrCtrl+Z',
            click: (item, focusedWindow) => {
                if (focusedWindow && focusedWindow instanceof BrowserWindow) {
                    focusedWindow.webContents.send('trigger-action', 'redo');
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Save Project',
            accelerator: 'CmdOrCtrl+S',
            click: (item, focusedWindow) => {
                if (focusedWindow && focusedWindow instanceof BrowserWindow) {
                    focusedWindow.webContents.send('trigger-action', 'save-project');
                }
            }
        },
        {
            label: 'Export Image',
            accelerator: 'CmdOrCtrl+Shift+S',
            click: (item, focusedWindow) => {
                if (focusedWindow && focusedWindow instanceof BrowserWindow) {
                    focusedWindow.webContents.send('trigger-action', 'export-image');
                }
            }
        },
        {
            label: 'Clear Canvas',
            click: (item, focusedWindow) => {
                if (focusedWindow && focusedWindow instanceof BrowserWindow) {
                    focusedWindow.webContents.send('trigger-action', 'clear');
                }
            }
        },
        { type: 'separator' },
        {
            label: 'Brush Style',
            submenu: [
                {
                    label: 'Smooth',
                    type: 'radio',
                    checked: brushType === 'smooth',
                    click: (item, focusedWindow) => {
                        if (focusedWindow && focusedWindow instanceof BrowserWindow) {
                            focusedWindow.webContents.send('set-brush', 'smooth');
                        }
                    }
                },
                {
                    label: 'Pen Style',
                    type: 'radio',
                    checked: brushType === 'texture',
                    click: (item, focusedWindow) => {
                        if (focusedWindow && focusedWindow instanceof BrowserWindow) {
                            focusedWindow.webContents.send('set-brush', 'texture');
                        }
                    }
                }
            ]
        }
    ];
};

