import { getState, getConfig } from '../utils/config.js';
import { getActiveTab } from './tabManager.js';
import { getCanvasCoords } from './canvas.js';
import { saveToHistory, saveProject } from './history.js';

/**
 * @typedef {Object} StickyNote
 * @property {number} x - X coordinate
 * @property {number} y - Y coordinate
 * @property {number} width - Width of sticky note
 * @property {number} height - Height of sticky note
 * @property {string} text - Text content
 * @property {string} color - Background color
 * @property {SVGGElement} group - SVG group element
 * @property {SVGRectElement} rect - SVG rectangle element
 * @property {SVGTextElement} textElement - SVG text element
 * @property {boolean} isEditing - Editing state flag
 * @property {Function} remove - Remove function
 * @property {Function} cleanup - Cleanup function for event listeners
 */

/**
 * @typedef {Object} DragState
 * @property {number} x - X offset
 * @property {number} y - Y offset
 */

// Constants cache
const SVG_NS = 'http://www.w3.org/2000/svg';
const POINTER_EVENTS_AUTO = 'auto';
const CURSOR_MOVE = 'move';
const USER_SELECT_NONE = 'none';

/**
 * Creates a new sticky note element
 * @param {number} x - X coordinate
 * @param {number} y - Y coordinate
 * @param {number} [width] - Optional width
 * @param {number} [height] - Optional height
 * @param {SVGGElement} [svgGroup] - Optional SVG group (for restoring from history)
 * @returns {StickyNote|null} The created sticky note object or null on error
 */
export const createStickyNote = (x, y, width, height, svgGroup) => {
    try {
        const state = getState();
        const activeTab = getActiveTab();
        
        if (!activeTab) {
            console.warn('No active tab to create sticky note');
            return null;
        }

        // Use provided svgGroup or get from active tab
        const targetSvgGroup = svgGroup || activeTab.svgGroup;
        
        if (!targetSvgGroup) {
            console.error('No SVG group available for sticky note');
            return null;
        }

        const config = getConfig().sticky;

        width = width | 0 || config.DEFAULT_WIDTH;
        height = height | 0 || config.DEFAULT_HEIGHT;

        // Create elements in batch
        const group = document.createElementNS(SVG_NS, 'g');
        const rect = document.createElementNS(SVG_NS, 'rect');
        const textElement = document.createElementNS(SVG_NS, 'text');

        // Set group properties
        group.style.pointerEvents = POINTER_EVENTS_AUTO;
        group.setAttribute('transform', `translate(${x}, ${y})`);

        // Batch rect attribute updates
        const rectAttrs = [
            ['x', 0],
            ['y', 0],
            ['width', width],
            ['height', height],
            ['fill', config.DEFAULT_COLOR],
            ['stroke', config.DEFAULT_STROKE],
            ['stroke-width', config.STROKE_WIDTH],
            ['rx', config.BORDER_RADIUS]
        ];

        for (let i = 0; i < rectAttrs.length; i++) {
            rect.setAttribute(rectAttrs[i][0], rectAttrs[i][1]);
        }
        rect.style.cursor = CURSOR_MOVE;

        // Batch text attribute updates
        const textX = config.TEXT_OFFSET_X;
        const textY = config.TEXT_OFFSET_Y;
        const textAttrs = [
            ['x', textX],
            ['y', textY],
            ['font-family', config.FONT_FAMILY],
            ['font-size', config.FONT_SIZE],
            ['fill', config.TEXT_COLOR]
        ];

        for (let i = 0; i < textAttrs.length; i++) {
            textElement.setAttribute(textAttrs[i][0], textAttrs[i][1]);
        }
        textElement.textContent = config.DEFAULT_TEXT;
        textElement.style.userSelect = USER_SELECT_NONE;

        // Append in batch (fewer reflows)
        group.appendChild(rect);
        group.appendChild(textElement);
        targetSvgGroup.appendChild(group);

        /** @type {StickyNote} */
        const stickyObj = {
            x: x,
            y: y,
            width: width,
            height: height,
            text: config.DEFAULT_TEXT,
            color: config.DEFAULT_COLOR,
            group: group,
            rect: rect,
            textElement: textElement,
            isEditing: false,
            cleanup: null,
            remove: () => {
                try {
                    if (typeof stickyObj.cleanup === 'function') {
                        stickyObj.cleanup();
                    }

                    if (stickyObj.group && stickyObj.group.parentNode) {
                        stickyObj.group.parentNode.removeChild(stickyObj.group);
                    }
                    
                    const currentTab = getActiveTab();
                    if (currentTab && currentTab.stickyNotes) {
                        const index = currentTab.stickyNotes.indexOf(stickyObj);
                        if (index > -1) {
                            currentTab.stickyNotes.splice(index, 1);
                        }
                    }
                    
                    saveProject();
                    saveToHistory();
                } catch (error) {
                    console.error('Error removing sticky note:', error);
                }
            }
        };

        // Create delete button
        const deleteBtn = document.createElementNS(SVG_NS, 'g');
        deleteBtn.setAttribute('class', 'sticky-note-delete-button');
        deleteBtn.style.cursor = 'pointer';

        const deleteCircle = document.createElementNS(SVG_NS, 'circle');
        deleteCircle.setAttribute('cx', width - config.DELETE_BTN_OFFSET);
        deleteCircle.setAttribute('cy', config.DELETE_BTN_OFFSET);
        deleteCircle.setAttribute('r', config.DELETE_BTN_RADIUS);
        deleteCircle.setAttribute('fill', '#ff5f57');
        deleteCircle.setAttribute('stroke', '#7d0000');
        deleteCircle.setAttribute('stroke-width', 0.5);

        const deleteLine1 = document.createElementNS(SVG_NS, 'line');
        const lineOffset = config.DELETE_BTN_RADIUS / 2.2;
        deleteLine1.setAttribute('x1', width - config.DELETE_BTN_OFFSET - lineOffset);
        deleteLine1.setAttribute('y1', config.DELETE_BTN_OFFSET - lineOffset);
        deleteLine1.setAttribute('x2', width - config.DELETE_BTN_OFFSET + lineOffset);
        deleteLine1.setAttribute('y2', config.DELETE_BTN_OFFSET + lineOffset);
        deleteLine1.setAttribute('stroke', '#7d0000');
        deleteLine1.setAttribute('stroke-width', 1);

        const deleteLine2 = document.createElementNS(SVG_NS, 'line');
        deleteLine2.setAttribute('x1', width - config.DELETE_BTN_OFFSET - lineOffset);
        deleteLine2.setAttribute('y1', config.DELETE_BTN_OFFSET + lineOffset);
        deleteLine2.setAttribute('x2', width - config.DELETE_BTN_OFFSET + lineOffset);
        deleteLine2.setAttribute('y2', config.DELETE_BTN_OFFSET - lineOffset);
        deleteLine2.setAttribute('stroke', '#7d0000');
        deleteLine2.setAttribute('stroke-width', 1);
        
        deleteBtn.appendChild(deleteCircle);
        deleteBtn.appendChild(deleteLine1);
        deleteBtn.appendChild(deleteLine2);
        group.appendChild(deleteBtn);

        const onDeleteClick = (e) => {
            e.stopPropagation();
            e.preventDefault();
            stickyObj.remove();
        };

        deleteBtn.addEventListener('click', onDeleteClick);

        setupStickyListeners(stickyObj);
        
        // Add to active tab's sticky notes
        if (activeTab.stickyNotes) {
            activeTab.stickyNotes.push(stickyObj);
        }

        return stickyObj;
    } catch (error) {
        console.error('Error creating sticky note:', error);
        return null;
    }
};

/**
 * Sets up event listeners for sticky note interactions
 * @param {StickyNote} sticky - The sticky note object
 * @returns {void}
 */
const setupStickyListeners = (sticky) => {
    try {
        let isDragging = false;
        /** @type {DragState} */
        const dragOffset = { x: 0, y: 0 };

        /**
         * @param {MouseEvent} e - Mouse event
         * @returns {void}
         */
        const onMouseDown = (e) => {
            try {
                const activeTab = getActiveTab();
                if (!activeTab) return;
                if (e.button !== 0) return;

                e.stopPropagation();
                e.preventDefault();
                
                isDragging = true;
                activeTab.isDraggingSticky = true;
                
                const coords = getCanvasCoords(e);
                dragOffset.x = coords.x - sticky.x;
                dragOffset.y = coords.y - sticky.y;
            } catch (error) {
                console.error('Error in mousedown handler:', error);
            }
        };

        /**
         * @param {MouseEvent} e - Mouse event
         * @returns {void}
         */
        const onMouseMove = (e) => {
            if (!isDragging) return;

            try {
                e.stopPropagation();
                e.preventDefault();
                
                const coords = getCanvasCoords(e);
                sticky.x = coords.x - dragOffset.x;
                sticky.y = coords.y - dragOffset.y;
                updateStickyPosition(sticky);
            } catch (error) {
                console.error('Error in mousemove handler:', error);
            }
        };

        /**
         * @param {MouseEvent} e - Mouse event
         * @returns {void}
         */
        const onMouseUp = (e) => {
            if (!isDragging) return;

            try {
                const activeTab = getActiveTab();
                if (activeTab) {
                    activeTab.isDraggingSticky = false;
                }

                e.stopPropagation();
                e.preventDefault();
                isDragging = false;
                
                saveProject();
                saveToHistory();
            } catch (error) {
                console.error('Error in mouseup handler:', error);
            }
        };

        /**
         * @param {MouseEvent} e - Mouse event
         * @returns {void}
         */
        const onDoubleClick = (e) => {
            try {
                e.stopPropagation();
                e.preventDefault();
                startStickyEditing(sticky);
            } catch (error) {
                console.error('Error in dblclick handler:', error);
            }
        };

        // Attach event listeners
        sticky.rect.addEventListener('mousedown', onMouseDown);
        sticky.rect.addEventListener('dblclick', onDoubleClick);
        
        document.addEventListener('mousemove', onMouseMove);
        document.addEventListener('mouseup', onMouseUp);

        sticky.cleanup = () => {
            sticky.rect.removeEventListener('mousedown', onMouseDown);
            sticky.rect.removeEventListener('dblclick', onDoubleClick);
            document.removeEventListener('mousemove', onMouseMove);
            document.removeEventListener('mouseup', onMouseUp);
        };
    } catch (error) {
        console.error('Error setting up sticky listeners:', error);
    }
};

/**
 * Updates sticky note position in DOM
 * @param {StickyNote} sticky - The sticky note object
 * @returns {void}
 */
const updateStickyPosition = (sticky) => {
    try {
        const x = Math.round(sticky.x * 100) / 100;
        const y = Math.round(sticky.y * 100) / 100;
        sticky.group.setAttribute('transform', `translate(${x}, ${y})`);
    } catch (error) {
        console.error('Error updating sticky position:', error);
    }
};

/**
 * Starts editing mode for sticky note
 * @param {StickyNote} sticky - The sticky note object
 * @returns {void}
 */
const startStickyEditing = (sticky) => {
    if (sticky.isEditing) return;

    try {
        sticky.isEditing = true;
        const originalText = sticky.text;

        const foreign = document.createElementNS(SVG_NS, 'foreignObject');
        const foreignAttrs = [
            ['x', 0],
            ['y', 0],
            ['width', sticky.width],
            ['height', sticky.height]
        ];

        for (let i = 0; i < foreignAttrs.length; i++) {
            foreign.setAttribute(foreignAttrs[i][0], foreignAttrs[i][1]);
        }

        const textarea = document.createElement('textarea');
        textarea.value = sticky.text;
        textarea.style.cssText = `
            width: 100%;
            height: 100%;
            border: 1px solid #adadad;
            outline: none;
            resize: both;
            font: 14px var(--font-text), sans-serif;
            background-color: rgba(255, 253, 208, 0.95);
            color: #000000;
            padding: 0.75rem;
            box-sizing: border-box;
            border-radius: 5px;
        `;

        const removeEditor = () => {
            if (foreign.parentNode) {
                foreign.parentNode.removeChild(foreign);
            }
            sticky.isEditing = false;
        };

        const saveChanges = () => {
            const newText = textarea.value.trim();
            if (newText) {
                sticky.text = newText;
                sticky.textElement.textContent = newText;
                saveProject();
                saveToHistory();
            } else {
                // If empty, revert to original
                sticky.text = originalText;
                sticky.textElement.textContent = originalText;
            }
            removeEditor();
        };

        const cancelChanges = () => {
            sticky.text = originalText;
            sticky.textElement.textContent = originalText;
            removeEditor();
        };

        const onBlur = () => {
            try {
                // CHANGED: Save changes on blur instead of canceling
                saveChanges();
            } catch (error) {
                console.error('Error in blur handler:', error);
                removeEditor();
            }
        };

        const onKeyDown = (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                saveChanges();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancelChanges();
            }
            // Allow Shift+Enter for new lines
        };

        const onTextareaClick = (e) => {
            e.stopPropagation();
        };

        textarea.addEventListener('blur', onBlur);
        textarea.addEventListener('keydown', onKeyDown);
        textarea.addEventListener('click', onTextareaClick);
        textarea.addEventListener('mousedown', onTextareaClick);
        
        foreign.appendChild(textarea);
        sticky.group.appendChild(foreign);
        
        setTimeout(() => {
            textarea.focus();
            textarea.select();
        }, 10);
    } catch (error) {
        console.error('Error starting sticky editing:', error);
        sticky.isEditing = false;
    }
};

/**
 * Removes all sticky notes from the active tab's canvas
 * @returns {void}
 */
export const removeAllStickyNotes = () => {
    try {
        const activeTab = getActiveTab();
        if (!activeTab || !activeTab.stickyNotes) {
            console.warn('No active tab or sticky notes to remove');
            return;
        }

        const notes = activeTab.stickyNotes.slice(); // Create a copy to avoid mutation during iteration

        // Remove all sticky notes
        notes.forEach(note => {
            if (note && typeof note.remove === 'function') {
                note.remove();
            }
        });

        // Clear array (should already be cleared by individual remove() calls, but ensure it)
        activeTab.stickyNotes.length = 0;
    } catch (error) {
        console.error('Error removing all sticky notes:', error);
    }
};

/**
 * Gets all sticky notes from the active tab
 * @returns {Array<StickyNote>} Array of sticky notes
 */
export const getStickyNotes = () => {
    const activeTab = getActiveTab();
    return activeTab && activeTab.stickyNotes ? activeTab.stickyNotes : [];
};

/**
 * Counts sticky notes in the active tab
 * @returns {number} Number of sticky notes
 */
export const getStickyNoteCount = () => {
    const activeTab = getActiveTab();
    return activeTab && activeTab.stickyNotes ? activeTab.stickyNotes.length : 0;
};

/**
 * This ensures sticky notes stay in the correct position relative to the canvas
 * @returns {void}
 */
export const updateAllStickyPositions = () => {
    try {
        const activeTab = getActiveTab();
        if (!activeTab || !activeTab.stickyNotes) return;

        activeTab.stickyNotes.forEach(sticky => {
            if (sticky && sticky.group) {
                updateStickyPosition(sticky);
            }
        });
    } catch (error) {
        console.error('Error updating sticky positions:', error);
    }
};