import { loadConfiguration, getState, getConfig } from './components/utils/config.js';
// JS file not yet migrated - will convert later
import { setupCanvas, requestRedraw } from './components/core/canvas.js';
import { setupColorPicker, adjustTheme } from './components/core/tools.js';
import { setupEventListeners } from './components/controllers/events.js';
import { createStickyNote } from './components/core/stickyNotes.js';
import { initializeTabs, getActiveTab } from './components/core/tabManager.js';

/**
 * Initialize options interface
 */
export interface InitOptions {
    color?: string;
    brushSize?: number;
    brushType?: string;
}

/**
 * Electron IPC interface
 */
interface ElectronIPC {
    on: (channel: string, callback: (...args: unknown[]) => void) => void;
    send: (channel: string, ...args: unknown[]) => void;
}

/**
 * Window extensions interface
 */
declare global {
    interface Window {
        Electron?: {
            ipcRenderer?: ElectronIPC;
            platform?: string;
            isMac?: boolean;
            isWindows?: boolean;
        };
        setupCanvas?: typeof setupCanvas;
        requestRedraw?: typeof requestRedraw;
        createStickyNote?: typeof createStickyNote;
    }
}

// Expose functions to window for inter-module communication
window.setupCanvas = setupCanvas;
window.requestRedraw = requestRedraw;
window.createStickyNote = createStickyNote;

/**
 * Main initialization function for the paint application
 */
export const initializePaint = async (data?: InitOptions): Promise<void> => {
    try {
        // Load configuration
        await loadConfiguration();
        // Initialize UI elements (non-tab-specific)
        initializeUIElements();
        // Setup non-canvas components
        if (data) {
            setupColorPicker(data as any);
        }
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
const initializeUIElements = (): void => {
    const state = getState();
    const config = getConfig();

    if (!state || !config) {
        throw new Error('State or config not loaded');
    }

    const ids = (config as unknown as { dom: { IDS: Record<string, string> } }).dom.IDS;

    // UI elements
    (state as any).colorPickerTrigger = document.getElementById(ids.colorPickerTrigger);
    (state as any).iroPickerContainer = document.getElementById(ids.iroPickerContainer);
    (state as any).sizePicker = document.getElementById(ids.brushSize);
    (state as any).sizeDisplay = document.getElementById(ids.sizeDisplay);
    (state as any).brushType = document.getElementById(ids.brushType);
    (state as any).exportFormat = document.getElementById(ids.exportFormat);
    (state as any).clearBtn = document.getElementById(ids.clearBtn);
    (state as any).saveBtn = document.getElementById(ids.saveBtn);

    // Hamburger menu elements
    (state as any).hamburgerBtn = document.getElementById('hamburger-btn');
    (state as any).toolMenu = document.getElementById('tool-menu');

    // Tool buttons (now inside the menu)
    (state as any).brushBtn = document.getElementById('brushBtn');
    (state as any).eraserBtn = document.getElementById('eraserBtn');
    (state as any).lineBtn = document.getElementById('lineBtn');

    // Initial tool state
    (state as any).currentTool = 'brush';

    // Log warnings for missing elements
    const elementChecks = [
        { name: 'colorPickerTrigger', element: (state as any).colorPickerTrigger },
        { name: 'iroPickerContainer', element: (state as any).iroPickerContainer },
        { name: 'sizePicker', element: (state as any).sizePicker },
        { name: 'sizeDisplay', element: (state as any).sizeDisplay },
        { name: 'brushType', element: (state as any).brushType },
        { name: 'clearBtn', element: (state as any).clearBtn },
        { name: 'saveBtn', element: (state as any).saveBtn },
        { name: 'hamburgerBtn', element: (state as any).hamburgerBtn },
        { name: 'toolMenu', element: (state as any).toolMenu },
        { name: 'brushBtn', element: (state as any).brushBtn },
        { name: 'eraserBtn', element: (state as any).eraserBtn },
        { name: 'lineBtn', element: (state as any).lineBtn }
    ];

    elementChecks.forEach(check => {
        if (!check.element) {
            console.warn(`Not found: ${check.name}`);
        }
    });
};

/**
 * Setup IPC handlers for Electron desktop app
 */
const setupIPCHandlers = (): void => {
    if (window.Electron?.ipcRenderer) {
        window.Electron.ipcRenderer.on('trigger-action',
            (...args: unknown[]) => {
                const action = args[0] as string;
                const value = args[1];
                switch (action) {
                    case 'undo':
                        import('./components/core/history.js').then(m => (m as any).undo());
                        break;
                    case 'redo':
                        import('./components/core/history.js').then(m => (m as any).redo());
                        break;
                    case 'save-project':
                        import('./components/core/history.js').then(m => (m as any).saveProject());
                        break;
                    case 'export-image':
                        import('./components/controllers/files.js').then(m => (m as any).saveImage());
                        break;
                    case 'clear':
                        import('./components/controllers/files.js').then(m => (m as any).clearCanvas());
                        break;
                    case 'zoom-in':
                        import('./components/controllers/zoomPan.js').then(m => (m as any).zoomIn());
                        break;
                    case 'zoom-out':
                        import('./components/controllers/zoomPan.js').then(m => (m as any).zoomOut());
                        break;
                    case 'zoom-reset':
                        import('./components/controllers/zoomPan.js').then(m => (m as any).resetZoom());
                        break;
                    case 'set-brush':
                        const state = getState();
                        if (state && (state as any).brushType && value) {
                            ((state as any).brushType as HTMLSelectElement).value = String(value);
                        }
                        break;
                }
            }
        );
    }
};

/**
 * Apply platform-specific styling to the document body
 */
const setupPlatform = (): void => {
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
    window.initializePaint = initializePaint;
}

