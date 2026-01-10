import { getState } from '../utils/config.js';
import { getActiveTab } from '../core/tabManager.js';
import { startDrawing, draw, stopDrawing } from '../core/drawing.js';
import { handleWheel } from './zoomPan.js';
import { handleKeyboard } from './keyboard.js';
import { clearCanvas, saveImage } from './files.js';
import { adjustTheme } from '../core/tools.js';

let globalListenersInitialized = false;

export const setupEventListeners = () => {
    const state = getState();
    if (!state) {
        console.error('State not initialized');
        return;
    }

    if (!globalListenersInitialized) {
        setupGlobalListeners(state);
        globalListenersInitialized = true;
    }
    
    setupCanvasListeners();
};

/**
 * Setup global event listeners that don't depend on specific canvas
 * @param {Object} state - Global state object
 */
const setupGlobalListeners = (state) => {
    // Color picker toggle
    if (state.colorPickerTrigger) {
        state.colorPickerTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            if (state.iroPickerContainer) {
                const isVisible = state.iroPickerContainer.style.display === 'flex';
                state.iroPickerContainer.style.display = isVisible ? 'none' : 'flex';
            }
        });
    }

    // Close color picker when clicking outside
    document.addEventListener('click', (e) => {
        if (state.iroPickerContainer && 
            !state.iroPickerContainer.contains(e.target) &&
            e.target !== state.colorPickerTrigger) {
            state.iroPickerContainer.style.display = 'none';
        }
    });

    // Tool buttons
    if (state.clearBtn) {
        state.clearBtn.addEventListener('click', clearCanvas);
    }
    if (state.saveBtn) {
        state.saveBtn.addEventListener('click', saveImage);
    }

    // Brush size display
    if (state.sizePicker && state.sizeDisplay) {
        state.sizePicker.addEventListener('input', () => {
            state.sizeDisplay.textContent = state.sizePicker.value + 'px';
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Shift key state for straight lines
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Shift') {
            const currentState = getState();
            if (currentState) {
                currentState.isShiftDown = true;
            }
        }
    });

    document.addEventListener('keyup', (e) => {
        if (e.key === 'Shift') {
            const currentState = getState();
            if (currentState) {
                currentState.isShiftDown = false;
            }
        }
    });

    // Reset shift state if window loses focus
    window.addEventListener('blur', () => {
        const currentState = getState();
        if (currentState) {
            currentState.isShiftDown = false;
        }
    });

    // Window resize with debounce
    let resizeTimer;
    window.addEventListener('resize', () => {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(() => {
            if (typeof window.setupCanvas === 'function') {
                window.setupCanvas();
            }
        }, 250);
    });

    // Theme change detection
    window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', adjustTheme);
};

/**
 * Setup canvas-specific event listeners for the active tab
 * This function can be called when switching tabs
 */
export const setupCanvasListeners = () => {
    const activeTab = getActiveTab();
    if (!activeTab || !activeTab.canvasContainer) {
        console.warn('No active tab or canvas container available');
        return;
    }

    const container = activeTab.canvasContainer;
    const state = getState();

    if (container.dataset.listenersSetup === 'true') {
        return;
    }

    // Mouse events for drawing
    const mouseDownHandler = (e) => startDrawing(e);
    
    const mouseMoveHandler = (e) => draw(e);
    
    container.addEventListener('mousedown', mouseDownHandler);
    container.addEventListener('mousemove', mouseMoveHandler);
    
    // Global mouseup to catch releases outside canvas
    const mouseUpHandler = (e) => {
        if (e.button !== 2) { // Not right-click
            stopDrawing();
        }
    };
    document.addEventListener('mouseup', mouseUpHandler);
    
    const mouseLeaveHandler = () => stopDrawing();
    document.addEventListener('mouseleave', mouseLeaveHandler);

    // Wheel for zoom/pan
    const wheelHandler = (e) => handleWheel(e);
    container.addEventListener('wheel', wheelHandler, { passive: false });

    // Touch events
    const touchStartHandler = (e) => handleTouch(e);
    const touchMoveHandler = (e) => handleTouchMove(e);
    const touchEndHandler = () => stopDrawing();
    
    container.addEventListener('touchstart', touchStartHandler, { passive: false });
    container.addEventListener('touchmove', touchMoveHandler, { passive: false });
    container.addEventListener('touchend', touchEndHandler);

    // Context menu
    const contextMenuHandler = (e) => {
        e.preventDefault();
        if (window.Electron && window.Electron.ipcRenderer) {
            const currentBrush = state.brushType ? state.brushType.value : 'smooth';
            window.Electron.ipcRenderer.send('show-context-menu', currentBrush);
        }
    };
    container.addEventListener('contextmenu', contextMenuHandler);

    // Track mouse position for the active canvas
    const mouseMoveTrackerHandler = (e) => {
        const rect = container.getBoundingClientRect();
        state.lastMouseX = e.clientX - rect.left;
        state.lastMouseY = e.clientY - rect.top;
    };
    container.addEventListener('mousemove', mouseMoveTrackerHandler);

    // Mark as setup
    container.dataset.listenersSetup = 'true';
    
    // Store cleanup function on the container for later removal
    container._cleanupListeners = () => {
        container.removeEventListener('mousedown', mouseDownHandler);
        container.removeEventListener('mousemove', mouseMoveHandler);
        container.removeEventListener('mousemove', mouseMoveTrackerHandler);
        container.removeEventListener('wheel', wheelHandler);
        container.removeEventListener('contextmenu', contextMenuHandler);
        container.removeEventListener('touchstart', touchStartHandler);
        container.removeEventListener('touchmove', touchMoveHandler);
        container.removeEventListener('touchend', touchEndHandler);
        document.removeEventListener('mouseup', mouseUpHandler);
        document.removeEventListener('mouseleave', mouseLeaveHandler);
        delete container.dataset.listenersSetup;
    };
};

/**
 * Handle touch start event
 * @param {TouchEvent} e - Touch event
 */
const handleTouch = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        target: e.target,
        preventDefault: () => { },
        stopPropagation: () => { }
    };
    startDrawing(mouseEvent);
};

/**
 * Handle touch move event
 * @param {TouchEvent} e - Touch event
 */
const handleTouchMove = (e) => {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY
    };
    draw(mouseEvent);
};

/**
 * Cleanup event listeners for a specific canvas container
 * Useful when closing tabs
 * @param {HTMLElement} container - Canvas container element
 */
export const cleanupCanvasListeners = (container) => {
    if (!container) return;
    
    // Call stored cleanup function if it exists
    if (typeof container._cleanupListeners === 'function') {
        container._cleanupListeners();
        delete container._cleanupListeners;
    }
    
    // Mark as not setup so it can be re-initialized
    delete container.dataset.listenersSetup;
};