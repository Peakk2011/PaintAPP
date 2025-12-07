// components/core/history.js
import { getState, getConfig } from '../utils/config.js';

export function saveToHistory() {
    const state = getState();
    const config = getConfig();

    const now = Date.now();
    const idx = state.historyIndex;
    const stack = state.historyStack;

    // Debounce check
    if (idx > 0 && idx === stack.length - 1) {
        const last = stack[idx];
        if (now - last.timestamp < config.constants.HISTORY_DEBOUNCE) {
            stack[idx] = createHistoryState(now);
            return;
        }
    }

    // Trim stack
    state.historyStack = stack.slice(0, idx + 1);

    // Push new state
    state.historyStack.push(createHistoryState(now));

    // Limit history
    const len = state.historyStack.length;
    if (len > config.constants.MAX_HISTORY) {
        state.historyStack.shift();
    } else {
        state.historyIndex++;
    }
}

function createHistoryState(timestamp) {
    const state = getState();

    return {
        imageData: state.drawingCtx.getImageData(
            0, 0,
            state.drawingCanvas.width,
            state.drawingCanvas.height
        ),
        stickyNotes: JSON.parse(JSON.stringify(state.stickyNotes)),
        timestamp
    };
}

export function undo() {
    const state = getState();
    if (state.historyIndex > 0) {
        state.historyIndex--;
        restoreFromHistory(state.historyStack[state.historyIndex]);
    }
}

export function redo() {
    const state = getState();
    const idx = state.historyIndex;
    const len = state.historyStack.length;
    if (idx < len - 1) {
        state.historyIndex++;
        restoreFromHistory(state.historyStack[idx + 1]);
    }
}

function restoreFromHistory(historyState) {
    if (!historyState) return;

    const state = getState();
    const config = getConfig();

    // Restore canvas
    state.drawingCtx.putImageData(historyState.imageData, 0, 0);

    // Clear existing sticky notes
    state.stickyNotes.forEach(note => note.remove());
    state.stickyNotes = [];

    // Restore sticky notes from history
    if (historyState.stickyNotes) {
        // Import createStickyNote function
        const createFunc = typeof createStickyNote === 'function'
            ? createStickyNote
            : window.createStickyNote;

        if (createFunc) {
            historyState.stickyNotes.forEach(noteData => {
                const sticky = createFunc(noteData.x, noteData.y, noteData.width, noteData.height);
                sticky.text = noteData.text;
                sticky.textElement.textContent = noteData.text;
                sticky.rect.setAttribute('fill', noteData.color);
                state.stickyNotes.push(sticky);
            });
        }
    }

    // Request redraw
    if (typeof window.requestRedraw === 'function') {
        window.requestRedraw();
    }
}

export function saveProject() {
    const state = getState();
    const config = getConfig();

    try {
        const projectData = {
            imageDataUrl: state.drawingCanvas.toDataURL(),
            stickyNotes: state.stickyNotes.map((note) => ({
                x: note.x,
                y: note.y,
                width: note.width,
                height: note.height,
                text: note.text,
                color: note.color
            }))
        };
        localStorage.setItem(config.storage.PROJECT_KEY, JSON.stringify(projectData));
    } catch (error) {
        console.error('Failed to save project:', error);
    }
}

export function loadProject() {
    const state = getState();
    const config = getConfig();

    const savedData = localStorage.getItem(config.storage.PROJECT_KEY);
    if (!savedData) return;

    try {
        const projectData = JSON.parse(savedData);
        const img = new Image();

        img.onload = () => {
            state.drawingCtx.clearRect(0, 0, state.drawingCanvas.width, state.drawingCanvas.height);
            state.drawingCtx.drawImage(img, 0, 0);

            if (typeof window.requestRedraw === 'function') {
                window.requestRedraw();
            }
            saveToHistory();
        };

        img.src = projectData.imageDataUrl;

        // Load sticky notes
        const createFunc = typeof createStickyNote === 'function'
            ? createStickyNote
            : window.createStickyNote;

        if (createFunc && projectData.stickyNotes) {
            projectData.stickyNotes.forEach(noteData => {
                const sticky = createFunc(noteData.x, noteData.y, noteData.width, noteData.height);
                sticky.text = noteData.text;
                sticky.textElement.textContent = noteData.text;
                sticky.rect.setAttribute('fill', noteData.color);
                state.stickyNotes.push(sticky);
            });
        }
    } catch (error) {
        console.error('Failed to load project:', error);
    }
}