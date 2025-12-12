/**
 * @fileoverview Main entry point and public API for the Paint application
 * @module paint/paint.module
 * 
 * @description
 * This module serves as the main entry point for the Paint application, exposing
 * a comprehensive public API for both ES6 module imports and global window access.
 * It aggregates functionality from various subsystems including drawing, history,
 * file operations, view controls, and sticky notes.
 */

import { initializePaint } from './paint.js';

import { undo, redo, saveProject, loadProject } from './components/core/history.js';
import { clearCanvas } from './components/controllers/files.js';
import { saveImage } from './components/controllers/files.js';
import { zoomIn, zoomOut, resetZoom } from './components/controllers/zoomPan.js';
import { createStickyNote, removeAllStickyNotes } from './components/core/stickyNotes.js';
import { startDrawing, stopDrawing } from './components/core/drawing.js';

/**
 * @typedef {Object} InitOptions
 * @property {string=} color                                                - Initial brush color (hex format)
 * @property {number=} brushSize                                            - Initial brush size in pixels
 * @property {string=} brushType                                            - Initial brush type ('pen' | 'marker' | 'spray' | etc.)
 */

/**
 * @typedef {Object} StickyNoteOptions
 * @property {number} x                                                     - X coordinate for note placement
 * @property {number} y                                                     - Y coordinate for note placement
 * @property {string=} text                                                 - Initial text content
 * @property {string=} color                                                - Note background color
 */

/**
 * @typedef {Object} HistoryAPI
 * @property {function(): void} undo                                        - Undo the last action
 * @property {function(): void} redo                                        - Redo the previously undone action
 * @property {function(): Promise<void>} saveProject                        - Save current project to file
 * @property {function(): Promise<void>} loadProject                        - Load project from file
 */

/**
 * @typedef {Object} CanvasAPI
 * @property {function(): void} clearCanvas                                 - Clear the entire canvas
 */

/**
 * @typedef {Object} FileAPI
 * @property {function(): Promise<void>} saveImage                          - Export canvas as image file
 */

/**
 * @typedef {Object} ViewAPI
 * @property {function(): void} zoomIn                                      - Zoom in on the canvas
 * @property {function(): void} zoomOut                                     - Zoom out from the canvas
 * @property {function(): void} resetZoom                                   - Reset zoom to 100%
 */

/**
 * @typedef {Object} NotesAPI
 * @property {function(StickyNoteOptions): HTMLElement} createStickyNote    - Create a new sticky note
 * @property {function(): void} removeAllStickyNotes                        - Remove all sticky notes from canvas
 */

/**
 * @typedef {Object} DrawingAPI
 * @property {function(MouseEvent): void} startDrawing                      - Start drawing operation
 * @property {function(MouseEvent): void} stopDrawing                       - Stop drawing operation
 */

/**
 * @typedef {Object} PaintAppAPI
 * @property {function(InitOptions=): Promise<void>} initialize             - Initialize the paint application
 * @property {HistoryAPI} history                                           - History management functions
 * @property {CanvasAPI} canvas                                             - Canvas manipulation functions
 * @property {FileAPI} file                                                 - File operations functions
 * @property {ViewAPI} view                                                 - View control functions
 * @property {NotesAPI} notes                                               - Sticky notes management functions
 * @property {DrawingAPI} drawing                                           - Drawing control functions
 */

/**
 * @typedef {Object} WindowPaintApp
 * @property {function(InitOptions=): Promise<void>} initialize             - Initialize the paint application
 * @property {function(): void} undo                                        - Undo the last action
 * @property {function(): void} redo                                        - Redo the previously undone action
 * @property {function(): void} clearCanvas                                 - Clear the entire canvas
 * @property {function(): Promise<void>} saveImage                          - Export canvas as image file
 * @property {function(): Promise<void>} saveProject                        - Save current project to file
 * @property {function(): Promise<void>} loadProject                        - Load project from file
 * @property {function(): void} zoomIn                                      - Zoom in on the canvas
 * @property {function(): void} zoomOut                                     - Zoom out from the canvas
 * @property {function(): void} resetZoom                                   - Reset zoom to 100%
 * @property {function(StickyNoteOptions): HTMLElement} createStickyNote    - Create a new sticky note
 * @property {function(): void} removeAllStickyNotes                        - Remove all sticky notes from canvas
 * @property {function(MouseEvent): void} startDrawing                      - Start drawing operation
 * @property {function(MouseEvent): void} stopDrawing                       - Stop drawing operation
 */

// Export public API

/**
 * Initialize the paint application
 * @type {function(InitOptions=): Promise<void>}
 */
export { initializePaint };

/**
 * Undo the last drawing action
 * @type {function(): void}
 */
export { undo };

/**
 * Redo the previously undone action
 * @type {function(): void}
 */
export { redo };

/**
 * Clear the entire canvas
 * @type {function(): void}
 */
export { clearCanvas };

/**
 * Export canvas as image file
 * @type {function(): Promise<void>}
 */
export { saveImage };

/**
 * Save current project to file
 * @type {function(): Promise<void>}
 */
export { saveProject };

/**
 * Load project from file
 * @type {function(): Promise<void>}
 */
export { loadProject };

/**
 * Zoom in on the canvas
 * @type {function(): void}
 */
export { zoomIn };

/**
 * Zoom out from the canvas
 * @type {function(): void}
 */
export { zoomOut };

/**
 * Reset zoom to 100%
 * @type {function(): void}
 */
export { resetZoom };

/**
 * Create a new sticky note on the canvas
 * @type {function(StickyNoteOptions): HTMLElement}
 */
export { createStickyNote };

/**
 * Remove all sticky notes from the canvas
 * @type {function(): void}
 */
export { removeAllStickyNotes };

/**
 * Start drawing operation
 * @type {function(MouseEvent): void}
 */
export { startDrawing };

/**
 * Stop drawing operation
 * @type {function(MouseEvent): void}
 */
export { stopDrawing };

/**
 * Default export containing all Paint application functionality
 * organized into logical namespaces
 * @type {PaintAppAPI}
 */
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
    /**
     * Global Paint application API exposed on window object
     * for script tag usage (non-module environments)
     */
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