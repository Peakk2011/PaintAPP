import { getState } from '../utils/config.js';
import { getActiveTab } from '../core/tabManager.js';
import { startDrawing, draw, stopDrawing } from '../core/drawing.js';
import { handleWheel } from './zoomPan.js';
import { handleKeyboard } from './keyboard.js';
import { clearCanvas, saveImage } from './files.js';
import { adjustTheme } from '../core/tools.js';

let globalListenersInitialized: boolean = false;

/**
 * Mouse event simulation for touch events
 */
interface SimulatedMouseEvent {
    clientX: number;
    clientY: number;
    button?: number;
    target?: EventTarget | null;
    preventDefault?: () => void;
    stopPropagation?: () => void;
}

/**
 * Updates the cursor for the active canvas based on the current tool and size.
 */
export const updateCursor = (): void => {
    const state = getState();
    const activeTab = getActiveTab();
    
    if (!state || !activeTab || !activeTab.canvasContainer) {
        return;
    }

    const tool: string = (state as any).currentTool;
    const size: number = (state as any).sizePicker ? parseFloat((state as any).sizePicker.value) : 10;
    const container: HTMLElement = activeTab.canvasContainer;

    if (tool === 'eraser') {
        const svg: string = `
            <svg
                width="${size}"
                height="${size}"
                viewBox="0 0 ${size} ${size}"
                xmlns="http://www.w3.org/2000/svg"
            >
                <circle
                    cx="${size / 2}"
                    cy="${size / 2}"
                    r="${size / 2 - 1}"
                    fill="none"
                    stroke="#999999"
                    stroke-width="2.5"
                />
            </svg>
        `;
        const hotspot: number = size / 2;
        container.style.cursor = `url('data:image/svg+xml;utf8,${encodeURIComponent(svg)}') ${hotspot} ${hotspot}, auto`;
    } else {
        container.style.cursor = 'crosshair';
    }
};

export const setupEventListeners = (): void => {
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
 */
const setupGlobalListeners = (state: any): void => {
    // Manage active tool state
    const setActiveTool = (tool: string): void => {
        state.currentTool = tool;
        const toolButtons: Array<{ btn: HTMLElement | null; name: string }> = [
            { btn: state.brushBtn, name: 'brush' },
            { btn: state.eraserBtn, name: 'eraser' },
            { btn: state.lineBtn, name: 'line' },
        ];
        toolButtons.forEach((item): void => {
            if (item.btn) {
                if (item.name === tool) {
                    item.btn.classList.add('active');
                } else {
                    item.btn.classList.remove('active');
                }
            }
        });
        console.log(`Tool changed to: ${tool}`);
        updateCursor();
    };

    // Color picker toggle
    if (state.colorPickerTrigger) {
        state.colorPickerTrigger.addEventListener('click', (e: Event): void => {
            e.stopPropagation();
            if (state.iroPickerContainer) {
                const isVisible: boolean = state.iroPickerContainer.style.display === 'flex';
                state.iroPickerContainer.style.display = isVisible ? 'none' : 'flex';
            }
        });
    }

    // Hamburger menu toggle
    if (state.hamburgerBtn) {
        state.hamburgerBtn.addEventListener('click', (e: Event): void => {
            e.stopPropagation();
            if (state.toolMenu) {
                const isHidden: boolean = state.toolMenu.classList.contains('hidden');
                if (isHidden) {
                    state.toolMenu.classList.remove('hidden');
                    state.toolMenu.classList.add('pop-up');
                } else {
                    state.toolMenu.classList.add('hidden');
                    state.toolMenu.classList.remove('pop-up');
                }
            }
        });
    }

    // Close pop-ups when clicking outside
    document.addEventListener('click', (e: Event): void => {
        const target = e.target as HTMLElement;
        
        // Color picker
        if (state.iroPickerContainer && 
            !state.iroPickerContainer.contains(target) &&
            target !== state.colorPickerTrigger) {
            state.iroPickerContainer.style.display = 'none';
        }
        
        // Tool menu
        if (state.toolMenu &&
            !state.toolMenu.contains(target) &&
            target !== state.hamburgerBtn &&
            state.hamburgerBtn &&
            !state.hamburgerBtn.contains(target)) {
            state.toolMenu.classList.add('hidden');
            state.toolMenu.classList.remove('pop-up');
        }
    });

    // Tool buttons
    if (state.brushBtn) {
        state.brushBtn.addEventListener('click', (): void => setActiveTool('brush'));
    }
    if (state.eraserBtn) {
        state.eraserBtn.addEventListener('click', (): void => setActiveTool('eraser'));
    }
    if (state.lineBtn) {
        state.lineBtn.addEventListener('click', (): void => setActiveTool('line'));
    }

    if (state.clearBtn) {
        state.clearBtn.addEventListener('click', clearCanvas);
    }
    if (state.saveBtn) {
        state.saveBtn.addEventListener('click', saveImage);
    }

    // Set initial active tool
    setActiveTool('brush');

    // Brush size display
    if (state.sizePicker && state.sizeDisplay) {
        state.sizePicker.addEventListener('input', (): void => {
            if (state.sizeDisplay && state.sizePicker) {
                state.sizeDisplay.textContent = state.sizePicker.value + 'px';
            }
            updateCursor();
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', handleKeyboard);

    // Shift key state for straight lines
    document.addEventListener('keydown', (e: KeyboardEvent): void => {
        if (e.key === 'Shift') {
            const currentState = getState();
            if (currentState) {
                currentState.isShiftDown = true;
            }
        }
    });

    document.addEventListener('keyup', (e: KeyboardEvent): void => {
        if (e.key === 'Shift') {
            const currentState = getState();
            if (currentState) {
                currentState.isShiftDown = false;
            }
        }
    });

    // Reset shift state if window loses focus
    window.addEventListener('blur', (): void => {
        const currentState = getState();
        if (currentState) {
            currentState.isShiftDown = false;
        }
    });

    // Window resize with debounce
    let resizeTimer: number;
    window.addEventListener('resize', (): void => {
        clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout((): void => {
            if (typeof (window as any).setupCanvas === 'function') {
                (window as any).setupCanvas();
            }
        }, 250);
    });

    // Theme change detection
    window.matchMedia('(prefers-color-scheme: dark)')
        .addEventListener('change', adjustTheme);
};

/**
 * Extended HTMLElement with custom properties
 */
interface ExtendedHTMLElement extends HTMLElement {
    _cleanupListeners?: () => void;
}

/**
 * Setup canvas-specific event listeners for the active tab
 * This function can be called when switching tabs
 */
export const setupCanvasListeners = (): void => {
    const activeTab = getActiveTab();
    if (!activeTab || !activeTab.canvasContainer) {
        console.warn('No active tab or canvas container available');
        return;
    }

    const container: ExtendedHTMLElement = activeTab.canvasContainer as ExtendedHTMLElement;
    const state = getState();

    // Update cursor for the new active tab
    updateCursor();

    if (container.dataset.listenersSetup === 'true') {
        return;
    }

    // Mouse events for drawing
    const mouseDownHandler = (e: MouseEvent): void => {
        startDrawing(e);
    };
    
    const mouseMoveHandler = (e: MouseEvent): void => {
        draw(e);
    };
    
    container.addEventListener('mousedown', mouseDownHandler);
    container.addEventListener('mousemove', mouseMoveHandler);
    
    // Global mouseup to catch releases outside canvas
    const mouseUpHandler = (e: MouseEvent): void => {
        if (e.button !== 2) { // Not right-click
            stopDrawing();
        }
    };
    document.addEventListener('mouseup', mouseUpHandler);
    
    const mouseLeaveHandler = (): void => stopDrawing();
    document.addEventListener('mouseleave', mouseLeaveHandler);

    // Wheel for zoom/pan
    const wheelHandler = (e: WheelEvent): void => handleWheel(e);
    container.addEventListener('wheel', wheelHandler, { passive: false });

    // Touch events
    const touchStartHandler = (e: TouchEvent): void => handleTouch(e);
    const touchMoveHandler = (e: TouchEvent): void => handleTouchMove(e);
    const touchEndHandler = (): void => stopDrawing();
    
    container.addEventListener('touchstart', touchStartHandler, { passive: false });
    container.addEventListener('touchmove', touchMoveHandler, { passive: false });
    container.addEventListener('touchend', touchEndHandler);

    // Context menu
    const contextMenuHandler = (e: MouseEvent): void => {
        e.preventDefault();
        if ((window as any).Electron && (window as any).Electron.ipcRenderer) {
            const currentBrush: string = (state as any)?.brushType ? (state as any).brushType.value : 'smooth';
            (window as any).Electron.ipcRenderer.send('show-context-menu', currentBrush);
        }
    };
    container.addEventListener('contextmenu', contextMenuHandler);

    // Track mouse position for the active canvas
    const mouseMoveTrackerHandler = (e: MouseEvent): void => {
        const rect: DOMRect = container.getBoundingClientRect();
        if (state) {
            (state as any).lastMouseX = e.clientX - rect.left;
            (state as any).lastMouseY = e.clientY - rect.top;
        }
    };
    container.addEventListener('mousemove', mouseMoveTrackerHandler);

    // Mark as setup
    container.dataset.listenersSetup = 'true';
    
    // Store cleanup function on the container for later removal
    container._cleanupListeners = (): void => {
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
 */
const handleTouch = (e: TouchEvent): void => {
    e.preventDefault();
    const touch: Touch = e.touches[0];
    const mouseEvent: SimulatedMouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY,
        button: 0,
        target: e.target,
        preventDefault: (): void => {},
        stopPropagation: (): void => {}
    };
    startDrawing(mouseEvent as any);
};

/**
 * Handle touch move event
 */
const handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    const touch: Touch = e.touches[0];
    const mouseEvent: SimulatedMouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY
    };
    draw(mouseEvent as any);
};

/**
 * Cleanup event listeners for a specific canvas container
 * Useful when closing tabs
 */
export const cleanupCanvasListeners = (container: HTMLElement | null): void => {
    if (!container) return;
    
    const extendedContainer = container as ExtendedHTMLElement;
    
    // Call stored cleanup function if it exists
    if (typeof extendedContainer._cleanupListeners === 'function') {
        extendedContainer._cleanupListeners();
        delete extendedContainer._cleanupListeners;
    }
    
    // Mark as not setup so it can be re-initialized
    delete extendedContainer.dataset.listenersSetup;
};