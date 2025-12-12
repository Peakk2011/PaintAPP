// paint.js - Main orchestrator

import { loadConfiguration, getState, getConfig } from './components/utils/config.js';
import { setupCanvas, initSVG, requestRedraw } from './components/core/canvas.js';
import { setupColorPicker, adjustTheme } from './components/core/tools.js';
import { setupEventListeners } from './components/controllers/events.js';
import { loadProject } from './components/core/history.js';
import { createStickyNote } from './components/core/stickyNotes.js';

/**
 * @typedef {Object} PaintState
 * @property {HTMLCanvasElement} canvas                     - Main display canvas
 * @property {CanvasRenderingContext2D} ctx                 - Main canvas rendering context
 * @property {HTMLElement} canvasContainer                  - Container element for the canvas
 * @property {HTMLCanvasElement} drawingCanvas              - Off-screen drawing canvas
 * @property {CanvasRenderingContext2D} drawingCtx          - Drawing canvas context
 * @property {HTMLCanvasElement} previewCanvas              - Preview canvas for temporary drawing
 * @property {CanvasRenderingContext2D} previewCtx          - Preview canvas context
 * @property {HTMLElement} colorPickerTrigger               - Color picker trigger button
 * @property {HTMLElement} iroPickerContainer               - Iro color picker container
 * @property {HTMLInputElement} sizePicker                  - Brush size input element
 * @property {HTMLElement} sizeDisplay                      - Brush size display element
 * @property {HTMLSelectElement} brushType                  - Brush type selector
 * @property {HTMLSelectElement} exportFormat               - Export format selector
 * @property {HTMLButtonElement} clearBtn                   - Clear canvas button
 * @property {HTMLButtonElement} saveBtn                    - Save project button
 * @property {Array<ImageData>} historyStack                - History stack for undo/redo
 */

/**
 * @typedef {Object} PaintConfig
 * @property {Object} dom                                   - DOM configuration
 * @property {Object} dom.IDS                               - DOM element IDs
 * @property {string} dom.IDS.canvas                        - Canvas element ID
 * @property {string} dom.IDS.canvasContainer               - Canvas container ID
 * @property {string} dom.IDS.colorPickerTrigger            - Color picker trigger ID
 * @property {string} dom.IDS.iroPickerContainer            - Iro picker container ID
 * @property {string} dom.IDS.brushSize                     - Brush size input ID
 * @property {string} dom.IDS.sizeDisplay                   - Size display element ID
 * @property {string} dom.IDS.brushType                     - Brush type selector ID
 * @property {string} dom.IDS.exportFormat                  - Export format selector ID
 * @property {string} dom.IDS.clearBtn                      - Clear button ID
 * @property {string} dom.IDS.saveBtn                       - Save button ID
 */

/**
 * @typedef {'undo' | 'redo' | 'save-project' | 'export-image' | 'clear' | 'zoom-in' | 'zoom-out' | 'zoom-reset' | 'set-brush'} IPCAction
 */

/**
 * @typedef {Object} ElectronAPI
 * @property {Object} ipcRenderer - IPC renderer for Electron communication
 * @property {function(string, function(Event, IPCAction, *): void): void} ipcRenderer.on - Register IPC event listener
 * @property {string} platform    - Current platform identifier
 * @property {boolean} isMac      - Whether running on macOS
 * @property {boolean} isWindows  - Whether running on Windows
 */

/**
 * @typedef {Object} WindowExtensions
 * @property {function(HTMLCanvasElement): void} setupCanvas    - Setup canvas function
 * @property {function(): void} requestRedraw                   - Request canvas redraw
 * @property {function(Object): HTMLElement} createStickyNote   - Create sticky note
 * @property {function(Object=): Promise<void>} initializePaint - Initialize paint app
 * @property {ElectronAPI=} Electron - Electron API (optional, only in desktop app)
 */

// Expose functions to window for inter-module communication
window.setupCanvas = setupCanvas;
window.requestRedraw = requestRedraw;
window.createStickyNote = createStickyNote;

/**
 * Main initialization function for the paint application
 * 
 * @async
 * @param {Object=} data                                    - Optional initialization data
 * @param {string=} data.color                              - Initial color value
 * @param {number=} data.brushSize                          - Initial brush size
 * @param {string=} data.brushType                          - Initial brush type
 * @returns {Promise<void>}
 * @throws {Error} When initialization fails
 * 
 * @example
 * await initializePaint({ color: '#FF0000', brushSize: 10 });
 */
export const initializePaint = async (data) => {
    try {
        // Load configuration
        await loadConfiguration();
        const state = getState();
        const config = getConfig();

        // Initialize DOM elements
        initializeDOMElements();

        // Setup components
        setupColorPicker(data);
        setupCanvas();
        loadProject();
        setupEventListeners();
        setupIPCHandlers();
        setupPlatform();
        adjustTheme();

        // Initial history save
        if (state.historyStack.length === 0) {
            import('./components/core/history.js')
                .then(module => module.saveToHistory());
        }

        // console.log('Paint app initialized successfully');
    } catch (error) {
        console.error('Failed to initialize paint app:', error);
    }
}

/**
 * Initialize all DOM elements and store references in the global state
 * 
 * @private
 * @returns {void}
 * @throws {Error} When required DOM elements are not found
 * 
 * @description
 * This function:
 * - Retrieves and caches references to main canvas and container elements
 * - Creates off-screen drawing and preview canvases with 2D contexts
 * - Initializes references to UI control elements (color picker, size picker, etc.)
 * - Uses willReadFrequently flag for optimized canvas context performance
 */
const initializeDOMElements = () => {
    const state = getState();
    const config = getConfig();
    const ids = config.dom.IDS;

    // Main canvas
    /** @type {HTMLCanvasElement} */
    state.canvas = document.getElementById(ids.canvas);
    /** @type {CanvasRenderingContext2D} */
    state.ctx = state.canvas.getContext('2d', { willReadFrequently: true });
    /** @type {HTMLElement} */
    state.canvasContainer = document.getElementById(ids.canvasContainer);

    // Drawing canvases
    /** @type {HTMLCanvasElement} */
    state.drawingCanvas = document.createElement('canvas');
    /** @type {CanvasRenderingContext2D} */
    state.drawingCtx = state.drawingCanvas.getContext('2d', { willReadFrequently: true });
    /** @type {HTMLCanvasElement} */
    state.previewCanvas = document.createElement('canvas');
    /** @type {CanvasRenderingContext2D} */
    state.previewCtx = state.previewCanvas.getContext('2d', { willReadFrequently: true });

    // UI elements
    /** @type {HTMLElement} */
    state.colorPickerTrigger = document.getElementById(ids.colorPickerTrigger);
    /** @type {HTMLElement} */
    state.iroPickerContainer = document.getElementById(ids.iroPickerContainer);
    /** @type {HTMLInputElement} */
    state.sizePicker = document.getElementById(ids.sizePicker);
    /** @type {HTMLElement} */
    state.sizeDisplay = document.getElementById(ids.sizeDisplay);
    /** @type {HTMLSelectElement} */
    state.brushType = document.getElementById(ids.brushType);
    /** @type {HTMLSelectElement} */
    state.exportFormat = document.getElementById(ids.exportFormat);
    /** @type {HTMLButtonElement} */
    state.clearBtn = document.getElementById(ids.clearBtn);
    /** @type {HTMLButtonElement} */
    state.saveBtn = document.getElementById(ids.saveBtn);
}

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
}

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
}

// Export for use in HTML
if (typeof window !== 'undefined') {
    /** @type {WindowExtensions} */
    window.initializePaint = initializePaint;
}