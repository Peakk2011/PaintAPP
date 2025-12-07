import { initializePaint } from './paint.js';

import { undo, redo, saveProject, loadProject } from './components/core/history.js';
import { clearCanvas } from './components/controllers/files.js';
import { saveImage } from './components/controllers/files.js';
import { zoomIn, zoomOut, resetZoom } from './components/controllers/zoomPan.js';
import { createStickyNote, removeAllStickyNotes } from './components/core/stickyNotes.js';
import { startDrawing, stopDrawing } from './components/core/drawing.js';

// Export public API
export {
    initializePaint,
    undo,
    redo,
    clearCanvas,
    saveImage,
    saveProject,
    loadProject,
    zoomIn,
    zoomOut,
    resetZoom,
    createStickyNote,
    removeAllStickyNotes,
    startDrawing,
    stopDrawing
};

// Default export
export default {
    initialize: initializePaint,
    history: { undo, redo, saveProject, loadProject },
    canvas: { clearCanvas },
    file: { saveImage },
    view: { zoomIn, zoomOut, resetZoom },
    notes: { createStickyNote, removeAllStickyNotes },
    drawing: { startDrawing, stopDrawing }
};

// Global export for script tag usage
if (typeof window !== 'undefined') {
    window.PaintApp = {
        initialize: initializePaint,
        undo,
        redo,
        clearCanvas,
        saveImage,
        saveProject,
        loadProject,
        zoomIn,
        zoomOut,
        resetZoom,
        createStickyNote,
        removeAllStickyNotes,
        startDrawing,
        stopDrawing
    };
}