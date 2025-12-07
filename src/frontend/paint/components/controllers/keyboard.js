// components/controllers/keyboard.js
import { getState } from '../utils/config.js';
import { undo, redo, saveProject } from '../core/history.js';  
import { clearCanvas, saveImage } from './files.js';           
import { zoomIn, zoomOut, resetZoom } from './zoomPan.js';

export function handleKeyboard(e) {
    const ctrl = e.ctrlKey || e.metaKey;
    const key = e.key;

    if (ctrl && key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
    } else if (ctrl && (key === 'y' || (key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
    } else if (ctrl && (key === '=' || key === '+')) {
        e.preventDefault();
        zoomIn();
    } else if (ctrl && key === '-') {
        e.preventDefault();
        zoomOut();
    } else if (ctrl && key === '0') {
        e.preventDefault();
        resetZoom();
    } else if (ctrl && (key === 'c' || key === 'C')) {
        e.preventDefault();
        clearCanvas();
    } else if (ctrl && e.shiftKey && (key === 's' || key === 'S')) {
        e.preventDefault();
        saveImage();
    } else if (ctrl && (key === 's' || key === 'S')) {
        e.preventDefault();
        saveProject();
    }
}