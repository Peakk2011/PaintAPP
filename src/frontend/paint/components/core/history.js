import { getState, getConfig } from '../utils/config.js';
import { getActiveTab } from './tabManager.js'; 
import { createStickyNote } from './stickyNotes.js';

/**
 * @typedef {Object} ProjectData
 * @property {string} imageDataUrl                  - Canvas data URL
 * @property {Array<Object>} stickyNotes            - Serialized sticky notes
 */

/**
 * Saves current state to history with debouncing
 * @returns {void}
 */
export const saveToHistory = () => {
    try {
        const state = getState();
        const config = getConfig();
        const activeTab = getActiveTab(); 
        if (!activeTab) return;

        const now = Date.now();
        const idx = activeTab.historyIndex;     // Use activeTab.historyIndex
        const stack = activeTab.historyStack;  

        // check update last entry if within debounce window
        if (idx > 0 && idx === stack.length - 1) {
            const last = stack[idx];
            const timeDiff = now - last.timestamp;
            if (timeDiff < config.constants.HISTORY_DEBOUNCE) {
                stack[idx] = createHistoryState(now);
                return;
            }
        }

        // Trim future history if we're not at the end
        activeTab.historyStack = stack.slice(0, idx + 1);

        // Push new state
        activeTab.historyStack.push(
            createHistoryState(now)
        );

        // Limit history size
        const len = activeTab.historyStack.length;
        
        if (len > config.constants.MAX_HISTORY) {
            activeTab.historyStack.shift();
        } else {
            activeTab.historyIndex++; // Use activeTab.historyIndex
        }
    } catch (error) {
        console.error('Error saving to history:', error);
    }
};

/**
 * Creates a history state snapshot
 * @param {number} timestamp - Current timestamp
 * @returns {HistoryState|null} History state object or null on error
 */
const createHistoryState = (timestamp) => {
    try {
        const state = getState();
        const activeTab = getActiveTab(); // Get active tab
        if (!activeTab) return null;

        const canvas = activeTab.drawingCanvas; // Use activeTab.drawingCanvas
        const ctx = activeTab.drawingCtx;       // Use activeTab.drawingCtx

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Deep clone sticky notes efficiently
        const notes = activeTab.stickyNotes; // Use activeTab.stickyNotes
        const notesLen = notes.length;
        const clonedNotes = new Array(notesLen);

        for (let i = 0; i < notesLen; i++) {
            const note = notes[i];
            clonedNotes[i] = {
                x: note.x,
                y: note.y,
                width: note.width,
                height: note.height,
                text: note.text,
                color: note.color
            };
        }

        return {
            imageData: imageData,
            stickyNotes: clonedNotes,
            timestamp: timestamp
        };
    } catch (error) {
        console.error('Error creating history state:', error);
        return null;
    }
};

/**
 * Undoes the last action
 * @returns {void}
 */
export const undo = () => {
    try {
        const state = getState();
        const activeTab = getActiveTab(); // Get active tab
        if (!activeTab) return;

        const idx = activeTab.historyIndex; // Use activeTab.historyIndex

        if (idx > 0) {
            activeTab.historyIndex = idx - 1; // Use activeTab.historyIndex
            restoreFromHistory(activeTab.historyStack[idx - 1]);
        }
    } catch (error) {
        console.error('Error undoing action:', error);
    }
};

/**
 * Redoes the last undone action
 * @returns {void}
 */
export const redo = () => {
    try {
        const state = getState();
        const activeTab = getActiveTab(); // Get active tab
        if (!activeTab) return;

        const idx = activeTab.historyIndex; // Use activeTab.historyIndex
        const len = activeTab.historyStack.length;

        if (idx < len - 1) {
            activeTab.historyIndex = idx + 1; // Use activeTab.historyIndex
            restoreFromHistory(activeTab.historyStack[idx + 1]);
        }
    } catch (error) {
        console.error('Error redoing action:', error);
    }
};

/**
 * Restores canvas and sticky notes from history state
 * @param {HistoryState} historyState - The history state to restore
 * @returns {void}
 */
const restoreFromHistory = (historyState) => {
    if (!historyState) return;

    try {
        const state = getState();
        const activeTab = getActiveTab(); // Get active tab
        if (!activeTab) return;

        // Restore canvas image data
        activeTab.drawingCtx.putImageData(historyState.imageData, 0, 0); // Use activeTab.drawingCtx

        // Clear existing sticky notes
        const notes = activeTab.stickyNotes; // Use activeTab.stickyNotes
        const notesLen = notes.length;
        for (let i = notesLen - 1; i >= 0; i--) {
            notes[i].remove();
        }
        activeTab.stickyNotes.length = 0; // Use activeTab.stickyNotes

        // Restore sticky notes from history
        if (historyState.stickyNotes) {
            if (createStickyNote) { // Use imported createStickyNote
                const savedNotes = historyState.stickyNotes;
                const savedLen = savedNotes.length;

                for (let i = 0; i < savedLen; i++) {
                    const noteData = savedNotes[i];
                    try {
                        const sticky = createStickyNote(
                            noteData.x,
                            noteData.y,
                            noteData.width,
                            noteData.height,
                            activeTab.svgGroup // Pass activeTab.svgGroup
                        );

                        if (sticky) {
                            sticky.text = noteData.text;
                            sticky.textElement.textContent = noteData.text;
                            sticky.rect.setAttribute('fill', noteData.color);
                            activeTab.stickyNotes.push(sticky); // Use activeTab.stickyNotes
                        }
                    } catch (noteErr) {
                        console.error('Error restoring sticky note:', noteErr);
                    }
                }
            }
        }

        // Request redraw
        if (typeof window.requestRedraw === 'function') {
            window.requestRedraw();
        }
    } catch (error) {
        console.error('Error restoring from history:', error);
    }
};

/**
 * Saves current project to localStorage
 * @returns {void}
 */
export const saveProject = () => {
    try {
        const state = getState();
        const config = getConfig();
        const activeTab = getActiveTab(); // Get active tab
        if (!activeTab) return;

        // Convert canvas to data URL
        const imageDataUrl = activeTab.drawingCanvas.toDataURL(); // Use activeTab.drawingCanvas

        // Serialize sticky notes
        const notes = activeTab.stickyNotes; // Use activeTab.stickyNotes
        const notesLen = notes.length;
        const serializedNotes = new Array(notesLen);

        for (let i = 0; i < notesLen; i++) {
            const note = notes[i];
            serializedNotes[i] = {
                x: note.x,
                y: note.y,
                width: note.width,
                height: note.height,
                text: note.text,
                color: note.color
            };
        }

        /** @type {ProjectData} */
        const projectData = {
            imageDataUrl: imageDataUrl,
            stickyNotes: serializedNotes
        };

        // Use a unique key for each tab's project
        localStorage.setItem(`${config.storage.PROJECT_KEY}-${activeTab.id}`, JSON.stringify(projectData));
    } catch (error) {
        console.error('Failed to save project:', error);
    }
};

/**
 * Loads project from localStorage
 * @returns {void}
 */
export const loadProject = () => {
    try {
        const state = getState();
        const config = getConfig();
        const activeTab = getActiveTab(); // Get active tab
        if (!activeTab) return;

        const savedData = localStorage.getItem(`${config.storage.PROJECT_KEY}-${activeTab.id}`); // Use unique key
        if (!savedData) return;

        /** @type {ProjectData} */
        const projectData = JSON.parse(savedData);
        const img = new Image();

        /**
         * Image load handler
         * @returns {void}
         */
        img.onload = () => {
            try {
                const canvas = activeTab.drawingCanvas; // Use activeTab.drawingCanvas
                const ctx = activeTab.drawingCtx; // Use activeTab.drawingCtx

                ctx.clearRect(0, 0, canvas.width, canvas.height);
                ctx.drawImage(img, 0, 0);

                if (typeof window.requestRedraw === 'function') {
                    window.requestRedraw();
                }
                saveToHistory();
            } catch (loadErr) {
                console.error('Error in image onload:', loadErr);
            }
        };

        /**
         * Image error handler
         * @returns {void}
         */
        img.onerror = () => {
            console.error('Failed to load project image');
        };

        img.src = projectData.imageDataUrl;

        // Clear existing sticky notes before loading
        activeTab.stickyNotes.forEach(note => note.remove());
        activeTab.stickyNotes.length = 0;

        // Load sticky notes
        if (createStickyNote && projectData.stickyNotes) { // Use imported createStickyNote
            const savedNotes = projectData.stickyNotes;
            const savedLen = savedNotes.length;

            for (let i = 0; i < savedLen; i++) {
                const noteData = savedNotes[i];
                try {
                    const sticky = createStickyNote(
                        noteData.x,
                        noteData.y,
                        noteData.width,
                        noteData.height,
                        activeTab.svgGroup // Pass activeTab.svgGroup
                    );

                    if (sticky) {
                        sticky.text = noteData.text;
                        sticky.textElement.textContent = noteData.text;
                        sticky.rect.setAttribute('fill', noteData.color);
                        activeTab.stickyNotes.push(sticky); // Use activeTab.stickyNotes
                    }
                } catch (noteErr) {
                    console.error('Error loading sticky note:', noteErr);
                }
            }
        }
    } catch (error) {
        console.error('Failed to load project:', error);
    }
};