import { app } from 'electron';

/**
 * Creates the application menu template for macOS.
 * @param {Function} createWindow - A function to create a new application window.
 * @param {object} windowSize - An object containing default window dimensions.
 * @returns {Electron.MenuItemConstructorOptions[]} The menu template.
 */
export const createMacMenu = (createWindow, windowSize) => {
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

/**
 * Creates the context menu template.
 * @param {string} currentBrush - Current brush type ('smooth' | 'texture')
 * @returns {Electron.MenuItemConstructorOptions[]}
 */
export const createContextMenu = (currentBrush) => {
    // Set default if currentBrush is undefined
    const brushType = currentBrush || 'smooth';

    return [
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
        },
        { type: 'separator' },
        {
            label: 'Save Project',
            accelerator: 'CmdOrCtrl+S',
            click: (item, focusedWindow) => {
                if (focusedWindow) {
                    focusedWindow.webContents.send('trigger-action', 'save-project');
                }
            }
        },
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
            label: 'Clear Canvas',
            click: (item, focusedWindow) => {
                if (focusedWindow) {
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
                        if (focusedWindow) {
                            focusedWindow.webContents.send('set-brush', 'smooth');
                        }
                    }
                },
                {
                    label: 'Pen Style',
                    type: 'radio',
                    checked: brushType === 'texture',
                    click: (item, focusedWindow) => {
                        if (focusedWindow) {
                            focusedWindow.webContents.send('set-brush', 'texture');
                        }
                    }
                }
            ]
        }
    ];
};