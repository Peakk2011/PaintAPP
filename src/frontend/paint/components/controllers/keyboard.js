import { getState } from '../utils/config.js';
import { getActiveTab } from '../core/tabManager.js';
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
    
    const activeTab = getActiveTab();
    if (!activeTab) {
        console.warn('No active tab for keyboard shortcut');
        return;
    }

    const target = e.target;
    if (target && (
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable
    )) {
        return;
    }

    // Undo: Ctrl/Cmd + Z (without Shift)
    if (ctrl && code === 'KeyZ' && !shift) {
        e.preventDefault();
        undo();
        return;
    }
    
    // Redo: Ctrl/Cmd + Shift + Z or Ctrl/Cmd + Y
    if (ctrl && ((code === 'KeyZ' && shift) || code === 'KeyY')) {
        e.preventDefault();
        redo();
        return;
    }
    
    // Zoom In: Ctrl/Cmd + = or Ctrl/Cmd + +
    if (ctrl && (code === 'Equal' || code === 'NumpadAdd')) {
        e.preventDefault();
        zoomIn();
        return;
    }
    
    // Zoom Out: Ctrl/Cmd + -
    if (ctrl && (code === 'Minus' || code === 'NumpadSubtract')) {
        e.preventDefault();
        zoomOut();
        return;
    }
    
    // Reset Zoom: Ctrl/Cmd + 0
    if (ctrl && (code === 'Digit0' || code === 'Numpad0')) {
        e.preventDefault();
        resetZoom();
        return;
    }
    
    // Export Image: Ctrl/Cmd + Shift + S
    if (ctrl && shift && code === 'KeyS') {
        e.preventDefault();
        saveImage();
        return;
    }
    
    // Save Project: Ctrl/Cmd + S (without Shift)
    if (ctrl && code === 'KeyS' && !shift) {
        e.preventDefault();
        saveProject();
        return;
    }
    
    // Clear Canvas: Ctrl/Cmd + Delete or Ctrl/Cmd + Backspace | Changed from Ctrl+C to avoid conflict with copy
    if (ctrl && (code === 'Delete' || code === 'Backspace')) {
        e.preventDefault();
        clearCanvas();
        return;
    }
    
    // Delete key: Remove selected sticky note (if implemented)
    if (code === 'Delete' || code === 'Backspace') {
        // Future: implement sticky note deletion
        // For now, only prevent default if not in input
        if (target !== document.body) {
            return;
        }
        e.preventDefault();
    }
};