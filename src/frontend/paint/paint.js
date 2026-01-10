import { loadConfiguration, getState, getConfig } from './components/utils/config.js';
import { setupCanvas, requestRedraw } from './components/core/canvas.js';
import { setupColorPicker, adjustTheme } from './components/core/tools.js';
import { setupEventListeners } from './components/controllers/events.js';
import { createStickyNote } from './components/core/stickyNotes.js';
import { initializeTabs, getActiveTab } from './components/core/tabManager.js';

// Expose functions to window for inter-module communication
window.setupCanvas = setupCanvas;
window.requestRedraw = requestRedraw;
window.createStickyNote = createStickyNote;

/**
 * Main initialization function for the paint application
 * 
 * @async
 * @param {Object=} data                - Optional initialization data
 * @param {string=} data.color          - Initial color value
 * @param {number=} data.brushSize      - Initial brush size
 * @param {string=} data.brushType      - Initial brush type
 * @returns {Promise<void>}
 * @throws {Error} When initialization fails
 */
export const initializePaint = async (data) => {
    try {
        // Load configuration
        await loadConfiguration();
        // Initialize UI elements (non-tab-specific)
        initializeUIElements();
        // Setup non-canvas components
        setupColorPicker(data);
        setupIPCHandlers();
        setupPlatform();
        adjustTheme();

        // Initialize tab system
        initializeTabs();

        // Setup event listeners
        setupEventListeners();

    } catch (error) {
        console.error('Failed to initialize paint app:', error);
        throw error;
    }
};

/**
 * Initialize non-canvas-specific UI elements and store references in the global state
 */
const initializeUIElements = () => {
    const state = getState();
    const config = getConfig();

    if (!state || !config) {
        throw new Error('State or config not loaded');
    }

    const ids = config.dom.IDS;

    // UI elements
    state.colorPickerTrigger = document.getElementById(ids.colorPickerTrigger);
    state.iroPickerContainer = document.getElementById(ids.iroPickerContainer);
    state.sizePicker = document.getElementById(ids.brushSize);
    state.sizeDisplay = document.getElementById(ids.sizeDisplay);
    state.brushType = document.getElementById(ids.brushType);
    state.exportFormat = document.getElementById(ids.exportFormat);
    state.clearBtn = document.getElementById(ids.clearBtn);
    state.saveBtn = document.getElementById(ids.saveBtn);

    // Log warnings for missing elements
    const elementChecks = [
        { name: 'colorPickerTrigger', element: state.colorPickerTrigger },
        { name: 'iroPickerContainer', element: state.iroPickerContainer },
        { name: 'sizePicker', element: state.sizePicker },
        { name: 'sizeDisplay', element: state.sizeDisplay },
        { name: 'brushType', element: state.brushType },
        { name: 'clearBtn', element: state.clearBtn },
        { name: 'saveBtn', element: state.saveBtn }
    ];

    elementChecks.forEach(check => {
        if (!check.element) {
            console.warn(`Not found: ${check.name} (${ids[check.name]})`);
        }
    });
};

/**
 * Setup IPC handlers for Electron desktop app
 * 
 * @private
 * @returns {void}
 * 
 * @description
 * Registers event handlers for IPC messages from the Electron main process.
 * Handles the following actions:
 * - 'undo': Undo last drawing action
 * - 'redo': Redo previously undone action
 * - 'save-project': Save current project
 * - 'export-image': Export canvas as image
 * - 'clear': Clear the entire canvas
 * - 'zoom-in': Zoom in on canvas
 * - 'zoom-out': Zoom out from canvas
 * - 'zoom-reset': Reset zoom to default
 * - 'set-brush': Change brush type
 * 
 * @example
 * // Electron main process sends:
 * mainWindow.webContents.send('trigger-action', 'undo');
 */
const setupIPCHandlers = () => {
    if (window.Electron && window.Electron.ipcRenderer) {
        window.Electron.ipcRenderer.on('trigger-action',
            /**
             * @param {Event} event - IPC event object
             * @param {IPCAction} action - Action type to perform
             * @param {*} value - Optional value parameter for the action
             * @returns {void}
             */
            (event, action, value) => {
                switch (action) {
                    case 'undo':
                        import('./components/core/history.js').then(m => m.undo());
                        break;
                    case 'redo':
                        import('./components/core/history.js').then(m => m.redo());
                        break;
                    case 'save-project':
                        import('./components/core/history.js').then(m => m.saveProject());
                        break;
                    case 'export-image':
                        import('./components/controllers/files.js').then(m => m.saveImage());
                        break;
                    case 'clear':
                        import('./components/controllers/files.js').then(m => m.clearCanvas());
                        break;
                    case 'zoom-in':
                        import('./components/controllers/zoomPan.js').then(m => m.zoomIn());
                        break;
                    case 'zoom-out':
                        import('./components/controllers/zoomPan.js').then(m => m.zoomOut());
                        break;
                    case 'zoom-reset':
                        import('./components/controllers/zoomPan.js').then(m => m.resetZoom());
                        break;
                    case 'set-brush':
                        const state = getState();
                        if (state.brushType && value) {
                            state.brushType.value = value;
                        }
                        break;
                }
            }
        );
    }
};

/**
 * Apply platform-specific styling to the document body
 * 
 * @private
 * @returns {void}
 * 
 * @description
 * Adds CSS classes to document.body based on the detected platform:
 * - 'platform-{platform}' - Generic platform identifier (darwin, win32, linux, etc.)
 * - 'mac' - Added specifically for macOS
 * - 'windows' - Added specifically for Windows
 * 
 * These classes enable platform-specific CSS styling for native-looking UI elements.
 * 
 * @example
 * // On macOS, body will have classes: "platform-darwin mac"
 * // On Windows, body will have classes: "platform-win32 windows"
 */
const setupPlatform = () => {
    if (window.Electron) {
        const platform = window.Electron.platform;
        const isMac = window.Electron.isMac;
        const isWindows = window.Electron.isWindows;

        if (platform) {
            document.body.classList.add('platform-' + platform);
        }
        if (isMac) {
            document.body.classList.add('mac');
        } else if (isWindows) {
            document.body.classList.add('windows');
        }
    }
};

// Export for use in HTML
if (typeof window !== 'undefined') {
    /** @type {WindowExtensions} */
    window.initializePaint = initializePaint;
}