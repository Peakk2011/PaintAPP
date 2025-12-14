import { getState, getConfig } from '../utils/config.js';

/**
 * @typedef {Object} HistoryState
 * @property {ImageData} imageData                  - Canvas image data
 * @property {Array<Object>} stickyNotes            - Serialized sticky notes
 * @property {number} timestamp                     - Creation timestamp
 */

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

        const now = Date.now();
        const idx = state.historyIndex;
        const stack = state.historyStack;

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
        state.historyStack = stack.slice(0, idx + 1);

        // Push new state
        state.historyStack.push(
            createHistoryState(now)
        );

        // Limit history size
        const len = state.historyStack.length;
        
        if (len > config.constants.MAX_HISTORY) {
            state.historyStack.shift();
        } else {
            state.historyIndex++;
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
        const canvas = state.drawingCanvas;
        const ctx = state.drawingCtx;

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Deep clone sticky notes efficiently
        const notes = state.stickyNotes;
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
        const idx = state.historyIndex;

        if (idx > 0) {
            state.historyIndex = idx - 1;
            restoreFromHistory(state.historyStack[idx - 1]);
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
        const idx = state.historyIndex;
        const len = state.historyStack.length;

        if (idx < len - 1) {
            state.historyIndex = idx + 1;
            restoreFromHistory(state.historyStack[idx + 1]);
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

        // Restore canvas image data
        state.drawingCtx.putImageData(historyState.imageData, 0, 0);

        // Clear existing sticky notes
        const notes = state.stickyNotes;
        const notesLen = notes.length;
        for (let i = notesLen - 1; i >= 0; i--) {
            notes[i].remove();
        }
        state.stickyNotes.length = 0;

        // Restore sticky notes from history
        if (historyState.stickyNotes) {
            // Get createStickyNote function
            const createFunc = typeof createStickyNote === 'function'
                ? createStickyNote
                : window.createStickyNote;

            if (createFunc) {
                const savedNotes = historyState.stickyNotes;
                const savedLen = savedNotes.length;

                for (let i = 0; i < savedLen; i++) {
                    const noteData = savedNotes[i];
                    try {
                        const sticky = createFunc(
                            noteData.x,
                            noteData.y,
                            noteData.width,
                            noteData.height
                        );

                        if (sticky) {
                            sticky.text = noteData.text;
                            sticky.textElement.textContent = noteData.text;
                            sticky.rect.setAttribute('fill', noteData.color);
                            state.stickyNotes.push(sticky);
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

        // Convert canvas to data URL
        const imageDataUrl = state.drawingCanvas.toDataURL();

        // Serialize sticky notes
        const notes = state.stickyNotes;
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

        const jsonData = JSON.stringify(projectData);
        localStorage.setItem(config.storage.PROJECT_KEY, jsonData);
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

        const savedData = localStorage.getItem(config.storage.PROJECT_KEY);
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
                const canvas = state.drawingCanvas;
                const ctx = state.drawingCtx;

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

        // Load sticky notes
        const createFunc = typeof createStickyNote === 'function'
            ? createStickyNote
            : window.createStickyNote;

        if (createFunc && projectData.stickyNotes) {
            const savedNotes = projectData.stickyNotes;
            const savedLen = savedNotes.length;

            for (let i = 0; i < savedLen; i++) {
                const noteData = savedNotes[i];
                try {
                    const sticky = createFunc(
                        noteData.x,
                        noteData.y,
                        noteData.width,
                        noteData.height
                    );

                    if (sticky) {
                        sticky.text = noteData.text;
                        sticky.textElement.textContent = noteData.text;
                        sticky.rect.setAttribute('fill', noteData.color);
                        state.stickyNotes.push(sticky);
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