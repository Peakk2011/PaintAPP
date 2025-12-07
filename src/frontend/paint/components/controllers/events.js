import { getState } from '../utils/config.js';
import { startDrawing, draw, stopDrawing } from '../core/drawing.js';
import { handleWheel } from './zoomPan.js';
import { handleKeyboard } from './keyboard.js';
import { clearCanvas, saveImage } from './files.js';
import { adjustTheme } from '../core/tools.js';

export function setupEventListeners() {
    const state = getState();
    const container = state.canvasContainer;

    // Mouse events
    container.addEventListener('mousedown', startDrawing);
    container.addEventListener('mousemove', draw);
    document.addEventListener('mouseup', (e) => {
        if (e.button !== 2) {
            stopDrawing();
        }
    });
    document.addEventListener('mouseleave', stopDrawing);

    // Wheel for zoom/pan
    container.addEventListener('wheel', handleWheel, { passive: false });

    // Touch events
    container.addEventListener('touchstart', handleTouch, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', stopDrawing);

    // Context menu
    container.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        if (window.Electron && window.Electron.ipcRenderer) {
            const currentBrush = state.brushType ? state.brushType.value : 'smooth';
            window.Electron.ipcRenderer.send('show-context-menu', currentBrush);
        }
    });

    // Track mouse position
    document.addEventListener('mousemove', (e) => {
        const rect = container.getBoundingClientRect();
        state.lastMouseX = e.clientX - rect.left;
        state.lastMouseY = e.clientY - rect.top;
    });

    // Color picker
    if (state.colorPickerTrigger) {
        state.colorPickerTrigger.addEventListener('click', (e) => {
            e.stopPropagation();
            const isVisible = state.iroPickerContainer.style.display === 'flex';
            state.iroPickerContainer.style.display = isVisible ? 'none' : 'flex';
        });
    }

    // Close color picker when clicking outside
    document.addEventListener('click', (e) => {
        if (!state.iroPickerContainer.contains(e.target) &&
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

    // Window events
    window.addEventListener('resize', handleResize);
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', adjustTheme);
}

function handleTouch(e) {
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
}

function handleTouchMove(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY
    };
    draw(mouseEvent);
}

function handleResize() {
    if (typeof window.setupCanvas === 'function') {
        window.setupCanvas();
    }
}