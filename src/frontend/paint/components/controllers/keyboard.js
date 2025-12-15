// components/controllers/keyboard.js
import { getState } from '../utils/config.js';
import { undo, redo, saveProject } from '../core/history.js';
import { clearCanvas, saveImage } from './files.js';
import { zoomIn, zoomOut, resetZoom } from './zoomPan.js';

/**
 * Handle keyboard shortcuts
 * @param {KeyboardEvent} e - Keyboard event
 */
export const handleKeyboard = (e) => {
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const code = e.code;

    // Undo: Ctrl/Cmd + Z
    if (ctrl && code === 'KeyZ' && !shift) {
        e.preventDefault();
        undo();
    }
    // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
    else if (ctrl && ((code === 'KeyZ' && shift) || code === 'KeyY')) {
        e.preventDefault();
        redo();
    }
    // Zoom In: Ctrl/Cmd + =  or  Ctrl/Cmd + +
    else if (ctrl && (code === 'Equal' || code === 'NumpadAdd')) {
        e.preventDefault();
        zoomIn();
    }
    // Zoom Out: Ctrl/Cmd + -
    else if (ctrl && (code === 'Minus' || code === 'NumpadSubtract')) {
        e.preventDefault();
        zoomOut();
    }
    // Reset Zoom: Ctrl/Cmd + 0
    else if (ctrl && (code === 'Digit0' || code === 'Numpad0')) {
        e.preventDefault();
        resetZoom();
    }
    // Clear Canvas: Ctrl/Cmd + C
    else if (ctrl && code === 'KeyC') {
        e.preventDefault();
        clearCanvas();
    }
    // Export Image: Ctrl/Cmd + Shift + S
    else if (ctrl && shift && code === 'KeyS') {
        e.preventDefault();
        saveImage();
    }
    // Save Project: Ctrl/Cmd + S
    else if (ctrl && code === 'KeyS' && !shift) {
        e.preventDefault();
        saveProject();
    }
};

/**
 * Key code reference for common shortcuts:
 * 
 * Letters: KeyA, KeyB, KeyC ... KeyZ
 * Numbers: Digit0-9 (top row) or Numpad0-9 (numpad)
 * Symbols:
 *   - Equal      (=)
 *   - Minus      (-)
 *   - BracketLeft  ([)
 *   - BracketRight (])
 *   - Backslash  (\)
 *   - Semicolon  (;)
 *   - Quote      (')
 *   - Comma      (,)
 *   - Period     (.)
 *   - Slash      (/)
 * 
 * Numpad:
 *   - NumpadAdd      (+)
 *   - NumpadSubtract (-)
 *   - NumpadMultiply (*)
 *   - NumpadDivide   (/)
 */