// paint.js - Main orchestrator
import { loadConfiguration, getState, getConfig } from './components/utils/config.js';
import { setupCanvas, initSVG, requestRedraw } from './components/core/canvas.js';
import { setupColorPicker, adjustTheme } from './components/core/tools.js';
import { setupEventListeners } from './components/controllers/events.js';
import { loadProject } from './components/core/history.js';
import { createStickyNote } from './components/core/stickyNotes.js';

// Expose functions to window for inter-module communication
window.setupCanvas = setupCanvas;
window.requestRedraw = requestRedraw;
window.createStickyNote = createStickyNote;

/**
 * Main initialization function
 */
export async function initializePaint(data) {
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

        console.log('Paint app initialized successfully');
    } catch (error) {
        console.error('Failed to initialize paint app:', error);
    }
}

/**
 * Initialize DOM elements
 */
function initializeDOMElements() {
    const state = getState();
    const config = getConfig();
    const ids = config.dom.IDS;

    // Main canvas
    state.canvas = document.getElementById(ids.canvas);
    state.ctx = state.canvas.getContext('2d', { willReadFrequently: true });
    state.canvasContainer = document.getElementById(ids.canvasContainer);

    // Drawing canvases
    state.drawingCanvas = document.createElement('canvas');
    state.drawingCtx = state.drawingCanvas.getContext('2d', { willReadFrequently: true });
    state.previewCanvas = document.createElement('canvas');
    state.previewCtx = state.previewCanvas.getContext('2d', { willReadFrequently: true });

    // UI elements
    state.colorPickerTrigger = document.getElementById(ids.colorPickerTrigger);
    state.iroPickerContainer = document.getElementById(ids.iroPickerContainer);
    state.sizePicker = document.getElementById(ids.brushSize);
    state.sizeDisplay = document.getElementById(ids.sizeDisplay);
    state.brushType = document.getElementById(ids.brushType);
    state.exportFormat = document.getElementById(ids.exportFormat);
    state.clearBtn = document.getElementById(ids.clearBtn);
    state.saveBtn = document.getElementById(ids.saveBtn);
}

/**
 * Setup IPC handlers for Electron
 */
function setupIPCHandlers() {
    if (window.Electron && window.Electron.ipcRenderer) {
        window.Electron.ipcRenderer.on('trigger-action', (event, action, value) => {
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
        });
    }
}

/**
 * Platform-specific styling
 */
function setupPlatform() {
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
    window.initializePaint = initializePaint;
}