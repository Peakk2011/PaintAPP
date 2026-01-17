import { getState, getConfig } from '../utils/config.js';
import { getActiveTab } from './tabManager.js';
import { createStickyNote } from './stickyNotes.js';
import type { StickyNote, HistoryState } from '../utils/config.js';

/**
 * Project data interface
 */
interface ProjectData {
    imageDataUrl: string;
    stickyNotes: Array<{
        x: number;
        y: number;
        width: number;
        height: number;
        text: string;
        color: string;
    }>;
    toolState?: {
        currentTool: string;
        brushSize: string;
        brushColor: string;
        brushType: string;
    };
}

/**
 * History tab interface
 */
interface HistoryTab {
    historyIndex: number;
    historyStack: HistoryState[];
    drawingCanvas: HTMLCanvasElement;
    drawingCtx: CanvasRenderingContext2D;
    stickyNotes: any[];
    svgGroup: SVGGElement | null;
    id: string;
    [key: string]: unknown;
}

/**
 * Sticky note interface for history
 */
interface HistoryStickyNote {
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    color: string;
    remove?: () => void;
}

declare global {
    interface Window {
        requestRedraw?: () => void;
    }
}

/**
 * Saves current state to history with debouncing
 */
export const saveToHistory = (): void => {
    try {
        const state = getState();
        const config = getConfig();
        const activeTab = getActiveTab() as unknown as HistoryTab;
        if (!activeTab) return;

        const now = Date.now();
        const idx = activeTab.historyIndex;
        const stack = activeTab.historyStack;

        // check update last entry if within debounce window
        if (idx > 0 && idx === stack.length - 1) {
            const last = stack[idx];
            const timeDiff = now - last.timestamp;
            const constants = (config as any)?.constants;
            if (constants && timeDiff < constants.HISTORY_DEBOUNCE) {
                const newState = createHistoryState(now);
                if (newState) {
                    stack[idx] = newState;
                }
                return;
            }
        }

        // Trim future history if we're not at the end
        activeTab.historyStack = stack.slice(0, idx + 1);

        // Push new state
        const newState = createHistoryState(now);
        if (newState) {
            activeTab.historyStack.push(newState);
        }

        // Limit history size
        const len = activeTab.historyStack.length;
        const constants = (config as any)?.constants;

        if (constants && len > constants.MAX_HISTORY) {
            activeTab.historyStack.shift();
        } else {
            activeTab.historyIndex++;
        }
    } catch (error) {
        console.error('Error saving to history:', error);
    }
};

/**
 * Creates a history state snapshot
 */
const createHistoryState = (timestamp: number): HistoryState | null => {
    try {
        const activeTab = getActiveTab() as unknown as HistoryTab;
        if (!activeTab) return null;

        const canvas = activeTab.drawingCanvas;
        const ctx = activeTab.drawingCtx;

        if (!canvas || !ctx) return null;

        // Get image data
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        // Deep clone sticky notes efficiently
        const notes = activeTab.stickyNotes;
        const notesLen = notes.length;
        const clonedNotes: HistoryStickyNote[] = new Array(notesLen);

        for (let i = 0; i < notesLen; i++) {
            const note = notes[i] as HistoryStickyNote;
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
            stickyNotes: clonedNotes as unknown as StickyNote[],
            timestamp: timestamp
        };
    } catch (error) {
        console.error('Error creating history state:', error);
        return null;
    }
};

/**
 * Undoes the last action
 */
export const undo = (): void => {
    try {
        const activeTab = getActiveTab() as unknown as HistoryTab;
        if (!activeTab) return;

        const idx = activeTab.historyIndex;

        if (idx > 0) {
            activeTab.historyIndex = idx - 1;
            restoreFromHistory(activeTab.historyStack[idx - 1]);
        }
    } catch (error) {
        console.error('Error undoing action:', error);
    }
};

/**
 * Redoes the last undone action
 */
export const redo = (): void => {
    try {
        const activeTab = getActiveTab() as unknown as HistoryTab;
        if (!activeTab) return;

        const idx = activeTab.historyIndex;
        const len = activeTab.historyStack.length;

        if (idx < len - 1) {
            activeTab.historyIndex = idx + 1;
            restoreFromHistory(activeTab.historyStack[idx + 1]);
        }
    } catch (error) {
        console.error('Error redoing action:', error);
    }
};

/**
 * Restores canvas and sticky notes from history state
 */
const restoreFromHistory = (historyState: HistoryState | null | undefined): void => {
    if (!historyState) return;

    try {
        const activeTab = getActiveTab() as unknown as HistoryTab;
        if (!activeTab) return;

        // Restore canvas image data
        activeTab.drawingCtx.putImageData(historyState.imageData, 0, 0);

        // Clear existing sticky notes
        const notes = activeTab.stickyNotes;
        const notesLen = notes.length;
        for (let i = notesLen - 1; i >= 0; i--) {
            const note = notes[i] as HistoryStickyNote;
            if (note && typeof note.remove === 'function') {
                note.remove();
            }
        }
        activeTab.stickyNotes.length = 0;

        // Restore sticky notes from history
        if (historyState.stickyNotes) {
            const savedNotes = historyState.stickyNotes;
            const savedLen = savedNotes.length;

            for (let i = 0; i < savedLen; i++) {
                const noteData = savedNotes[i] as any;
                try {
                    const sticky = createStickyNote(
                        noteData.x,
                        noteData.y,
                        noteData.width || 200,
                        noteData.height || 150,
                        activeTab.svgGroup || undefined
                    );

                    if (sticky) {
                        const stickyNote = sticky as any;
                        stickyNote.text = noteData.text || noteData.content || '';
                        if (stickyNote.textElement) {
                            stickyNote.textElement.textContent = noteData.text || noteData.content || '';
                        }
                        if (stickyNote.rect) {
                            stickyNote.rect.setAttribute('fill', noteData.color || '#ffff99');
                        }
                        activeTab.stickyNotes.push(sticky);
                    }
                } catch (noteErr) {
                    console.error('Error restoring sticky note:', noteErr);
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
 */
export const saveProject = (): void => {
    try {
        const state = getState();
        const config = getConfig();
        const activeTab = getActiveTab() as unknown as HistoryTab;
        if (!activeTab || !state) return;

        // Convert canvas to data URL
        const imageDataUrl = activeTab.drawingCanvas.toDataURL();

        // Serialize sticky notes
        const serializedNotes = activeTab.stickyNotes.map((note: any) => ({
            x: Number(note.x) || 0,
            y: Number(note.y) || 0,
            width: Number(note.width) || 0,
            height: Number(note.height) || 0,
            text: String(note.text || note.content || ''),
            color: String(note.color || '#ffff99')
        }));

        const projectData: ProjectData = {
            imageDataUrl: imageDataUrl,
            stickyNotes: serializedNotes,
            // Save tool and brush state
            toolState: {
                currentTool: (state as any).currentTool || 'brush',
                brushSize: (state as any).sizePicker ? String((state as any).sizePicker.value) : '5',
                brushColor: String((state as any).brushColor || '#000000'),
                brushType: (state as any).brushType ? String((state as any).brushType.value) : 'smooth'
            }
        };

        // Use a unique key for each tab's project
        const storage = (config as any)?.storage;
        if (storage && storage.PROJECT_KEY) {
            const projectKey = `${storage.PROJECT_KEY}-${activeTab.id}`;
            localStorage.setItem(projectKey, JSON.stringify(projectData));
        }
    } catch (error) {
        console.error('Failed to save project:', error);
    }
};

/**
 * Loads project from localStorage
 */
export const loadProject = (): void => {
    try {
        const state = getState();
        const config = getConfig();
        const activeTab = getActiveTab() as unknown as HistoryTab;
        if (!activeTab || !state) return;

        const storage = (config as any)?.storage;
        if (!storage || !storage.PROJECT_KEY) return;

        const projectKey = `${storage.PROJECT_KEY}-${activeTab.id}`;
        const savedData = localStorage.getItem(projectKey);
        if (!savedData) return;

        const projectData: ProjectData = JSON.parse(savedData);
        const img = new Image();

        /**
         * Image load handler
         */
        img.onload = (): void => {
            try {
                const canvas = activeTab.drawingCanvas;
                const ctx = activeTab.drawingCtx;

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

        img.onerror = (): void => {
            console.error('Failed to load project image');
        };

        img.src = projectData.imageDataUrl;

        // Restore tool state
        if (projectData.toolState) {
            const { toolState } = projectData;
            (state as any).currentTool = toolState.currentTool || 'brush';
            (state as any).brushColor = toolState.brushColor || '#000000';

            if ((state as any).sizePicker) {
                (state as any).sizePicker.value = toolState.brushSize || '5';
            }

            if ((state as any).sizeDisplay) {
                (state as any).sizeDisplay.textContent = (toolState.brushSize || '5') + 'px';
            }

            if ((state as any).brushType) {
                (state as any).brushType.value = toolState.brushType || 'smooth';
            }

            if ((state as any).colorPickerTrigger) {
                ((state as any).colorPickerTrigger as HTMLElement).style.backgroundColor = (state as any).brushColor;
            }

            if ((state as any).colorPicker && (state as any).colorPicker.color) {
                (state as any).colorPicker.color.hexString = (state as any).brushColor;
            }

            // Update active button UI
            const toolButtons = [
                (state as any).brushBtn,
                (state as any).eraserBtn,
                (state as any).lineBtn
            ];
            
            toolButtons.forEach((btn: HTMLElement | null) => {
                if (btn) {
                    btn.classList.remove('active');
                }
            });
            
            if ((state as any).currentTool === 'brush' && (state as any).brushBtn) {
                ((state as any).brushBtn as HTMLElement).classList.add('active');
            } else if ((state as any).currentTool === 'eraser' && (state as any).eraserBtn) {
                ((state as any).eraserBtn as HTMLElement).classList.add('active');
            } else if ((state as any).currentTool === 'line' && (state as any).lineBtn) {
                ((state as any).lineBtn as HTMLElement).classList.add('active');
            }
        }

        // Clear existing sticky notes before loading
        activeTab.stickyNotes.forEach((note: HistoryStickyNote) => {
            if (note && typeof note.remove === 'function') {
                note.remove();
            }
        });
        activeTab.stickyNotes.length = 0;

        // Load sticky notes
        if (projectData.stickyNotes) {
            projectData.stickyNotes.forEach(noteData => {
                try {
                    const sticky = createStickyNote(
                        noteData.x,
                        noteData.y,
                        noteData.width,
                        noteData.height,
                        activeTab.svgGroup || undefined
                    );

                    if (sticky) {
                        (sticky as any).text = noteData.text;
                        (sticky as any).textElement.textContent = noteData.text;
                        (sticky as any).rect.setAttribute('fill', noteData.color);
                        activeTab.stickyNotes.push(sticky);
                    }
                } catch (noteErr) {
                    console.error('Error loading sticky note:', noteErr);
                }
            });
        }
    } catch (error) {
        console.error('Failed to load project:', error);
    }
};