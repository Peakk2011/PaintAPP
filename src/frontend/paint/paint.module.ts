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

import { initializePaint, InitOptions } from './paint.js';

// TypeScript files
import { undo, redo, saveProject, loadProject } from './components/core/history.js';
import { clearCanvas } from './components/controllers/files.js';
import { saveImage } from './components/controllers/files.js';
import { zoomIn, zoomOut, resetZoom } from './components/controllers/zoomPan.js';
import { createStickyNote as createStickyNoteOriginal, removeAllStickyNotes } from './components/core/stickyNotes.js';
import { startDrawing, stopDrawing } from './components/core/drawing.js';

/**
 * Sticky note options interface
 */
export interface StickyNoteOptions {
    x: number;
    y: number;
    text?: string;
    color?: string;
}

/**
 * History API interface
 */
export interface HistoryAPI {
    undo: () => void;
    redo: () => void;
    saveProject: () => void;
    loadProject: () => void;
}

/**
 * Canvas API interface
 */
export interface CanvasAPI {
    clearCanvas: () => void;
}

/**
 * File API interface
 */
export interface FileAPI {
    saveImage: () => void | Promise<void>;
}

/**
 * View API interface
 */
export interface ViewAPI {
    zoomIn: () => void;
    zoomOut: () => void;
    resetZoom: () => void;
}

/**
 * Notes API interface
 */
export interface NotesAPI {
    createStickyNote: (options: StickyNoteOptions) => HTMLElement | null;
    removeAllStickyNotes: () => void;
}

/**
 * Drawing API interface
 */
export interface DrawingAPI {
    startDrawing: (event: MouseEvent) => void;
    stopDrawing: (event: MouseEvent) => void;
}

/**
 * Paint App API interface
 */
export interface PaintAppAPI {
    initialize: (options?: InitOptions) => Promise<void>;
    history: HistoryAPI;
    canvas: CanvasAPI;
    file: FileAPI;
    view: ViewAPI;
    notes: NotesAPI;
    drawing: DrawingAPI;
}

/**
 * Wrapper function to match the expected signature
 */
const createStickyNote = (options: StickyNoteOptions): HTMLElement | null => {
    const { x, y, text, color } = options;
    const sticky = createStickyNoteOriginal(x, y, undefined, undefined, undefined);
    
    if (sticky && text) {
        (sticky as any).text = text;
        (sticky as any).textElement.textContent = text;
    }
    
    if (sticky && color) {
        (sticky as any).color = color;
        (sticky as any).rect.setAttribute('fill', color);
    }
    
    return sticky ? (sticky.group as unknown as HTMLElement) : null;
};

// Export public API

export { initializePaint };

export { undo };
export { redo };
export { clearCanvas };
export { saveImage };
export { saveProject };
export { loadProject };
export { zoomIn };
export { zoomOut };
export { resetZoom };
export { createStickyNote };
export { removeAllStickyNotes };
export { startDrawing };
export { stopDrawing };

/**
 * Default export containing all Paint application functionality
 * organized into logical namespaces
 */
const PaintApp: PaintAppAPI = {
    initialize: initializePaint,
    history: { undo, redo, saveProject, loadProject },
    canvas: { clearCanvas },
    file: { saveImage },
    view: { zoomIn, zoomOut, resetZoom },
    notes: { createStickyNote, removeAllStickyNotes },
    drawing: { startDrawing, stopDrawing }
};

export default PaintApp;

// Global export for script tag usage
declare global {
    interface Window {
        PaintApp: PaintAppAPI;
    }
}

if (typeof window !== 'undefined') {
    /**
     * Global Paint application API exposed on window object
     * for script tag usage (non-module environments)
     */
    window.PaintApp = PaintApp;
}